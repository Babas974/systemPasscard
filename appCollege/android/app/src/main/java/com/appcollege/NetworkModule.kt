package com.appcollege

import android.content.Intent
import android.net.wifi.WifiManager
import android.content.Context
import android.os.Environment
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.Promise
import com.facebook.react.module.annotations.ReactModule
import java.io.File
import java.io.FileWriter
import java.net.Inet4Address
import java.net.NetworkInterface
import java.net.InetAddress
import java.net.Socket
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.concurrent.Executors
import java.util.concurrent.CountDownLatch
import java.util.concurrent.TimeUnit
import java.util.concurrent.ConcurrentLinkedQueue
import java.util.concurrent.atomic.AtomicInteger

@ReactModule(name = NetworkModule.NAME)
class NetworkModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {
    companion object {
        const val NAME = "NetworkModule"
        private const val PORT_MIN = 8389 // SYNC: ApiService.ts, main.rs
        private const val PORT_MAX = 8399 // SYNC: ApiService.ts, main.rs
        private const val TIMEOUT_MS = 500
        private const val PING_TIMEOUT_MS = 200
    }

    override fun getName(): String = NAME

    @ReactMethod
    fun getDeviceIP(promise: Promise) {
        try {
            val ip = getLocalIPAddress()
            promise.resolve(ip)
        } catch (e: Exception) {
            promise.reject("ERROR", "Impossible de recuperer l'IP", e)
        }
    }

    @ReactMethod
    fun pingServer(ip: String, promise: Promise) {
        try {
            val socket = Socket()
            try {
                socket.connect(java.net.InetSocketAddress(ip, PORT_MIN), PING_TIMEOUT_MS)
                socket.close()
                promise.resolve(PORT_MIN)
            } catch (_: Exception) {
                // Essayer les ports suivants
                var found = false
                for (port in (PORT_MIN + 1)..PORT_MAX) {
                    try {
                        val socket2 = Socket()
                        socket2.connect(java.net.InetSocketAddress(ip, port), PING_TIMEOUT_MS)
                        socket2.close()
                        promise.resolve(port)
                        found = true
                        break
                    } catch (_: Exception) {}
                }
                if (!found) {
                    promise.resolve(0) // Aucun port ne repond
                }
            } finally {
                try { socket.close() } catch (_: Exception) {}
            }
        } catch (e: Exception) {
            promise.resolve(0)
        }
    }

    @ReactMethod
    fun scanNetwork(promise: Promise) {
        try {
            val baseIP = getLocalIPAddress()
            if (baseIP == "127.0.0.1") {
                promise.reject("ERROR", "IP locale non trouvee")
                return
            }

            val parts = baseIP.split(".")
            val prefix = "${parts[0]}.${parts[1]}.${parts[2]}"
            val found = ConcurrentLinkedQueue<Pair<String, Int>>()

            // Pool de 20 threads max (pas 254 simultanes)
            val pool = Executors.newFixedThreadPool(20)
            val latch = CountDownLatch(254)

            for (i in 1..254) {
                pool.submit {
                    try {
                        val ip = "$prefix.$i"
                        // Tester les ports dans l'ordre
                        for (port in PORT_MIN..PORT_MAX) {
                            try {
                                val socket = Socket()
                                socket.connect(java.net.InetSocketAddress(ip, port), TIMEOUT_MS)
                                socket.close()
                                found.add(Pair(ip, port))
                                break
                            } catch (_: Exception) {}
                        }
                    } finally {
                        latch.countDown()
                    }
                }
            }

            // Attendre max 5s que le pool termine
            latch.await(5, TimeUnit.SECONDS)
            pool.shutdownNow()

            val result = found.firstOrNull()
            if (result != null) {
                // Retourner IP:port
                promise.resolve("${result.first}:${result.second}")
            } else {
                promise.reject("NOT_FOUND", "Aucun serveur trouve sur le reseau")
            }
        } catch (e: Exception) {
            promise.reject("ERROR", "Erreur lors du scan reseau", e)
        }
    }

    private fun getLocalIPAddress(): String {
        try {
            val interfaces = NetworkInterface.getNetworkInterfaces()
            while (interfaces.hasMoreElements()) {
                val networkInterface = interfaces.nextElement()
                val addresses = networkInterface.inetAddresses
                while (addresses.hasMoreElements()) {
                    val address = addresses.nextElement()
                    if (!address.isLoopbackAddress && address is Inet4Address) {
                        return address.hostAddress ?: "127.0.0.1"
                    }
                }
            }
        } catch (_: Exception) {}
        return "127.0.0.1"
    }

    @ReactMethod
    fun writeLogFile(content: String, promise: Promise) {
        try {
            val dir = File(
                reactApplicationContext.getExternalFilesDir(Environment.DIRECTORY_DOCUMENTS),
                "appcollege-logs"
            )
            if (!dir.exists()) dir.mkdirs()

            val timestamp = SimpleDateFormat("yyyyMMdd_HHmmss", Locale.FRANCE).format(Date())
            val file = File(dir, "appcollege_$timestamp.log")
            FileWriter(file).use { it.write(content) }

            promise.resolve(file.absolutePath)
        } catch (e: Exception) {
            promise.reject("ERROR", "Impossible d'ecrire le fichier log", e)
        }
    }

    @ReactMethod
    fun shareLogFile(filePath: String, promise: Promise) {
        try {
            val file = File(filePath)
            if (!file.exists()) {
                promise.reject("ERROR", "Fichier introuvable: $filePath")
                return
            }

            val uri = androidx.core.content.FileProvider.getUriForFile(
                reactApplicationContext,
                "${reactApplicationContext.packageName}.fileprovider",
                file
            )

            val intent = Intent(Intent.ACTION_SEND).apply {
                type = "text/plain"
                putExtra(Intent.EXTRA_STREAM, uri)
                addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }

            reactApplicationContext.startActivity(
                Intent.createChooser(intent, "Exporter les logs")
                    .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            )
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("ERROR", "Impossible de partager le fichier", e)
        }
    }
}
