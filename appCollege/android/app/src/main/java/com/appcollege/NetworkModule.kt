package com.appcollege

import android.net.wifi.WifiManager
import android.content.Context
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.Promise
import com.facebook.react.module.annotations.ReactModule
import java.net.Inet4Address
import java.net.NetworkInterface
import java.net.InetAddress
import java.net.Socket

@ReactModule(name = NetworkModule.NAME)
class NetworkModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {
    companion object {
        const val NAME = "NetworkModule"
        private const val PORT = 8389
        private const val TIMEOUT_MS = 500
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
    fun scanNetwork(promise: Promise) {
        try {
            val baseIP = getLocalIPAddress()
            if (baseIP == "127.0.0.1") {
                promise.reject("ERROR", "IP locale non trouvee")
                return
            }

            val parts = baseIP.split(".")
            val prefix = "${parts[0]}.${parts[1]}.${parts[2]}"
            val found = mutableListOf<String>()

            // Scanner en parallele avec des threads
            val threads = mutableListOf<Thread>()
            val lock = Any()

            for (i in 1..254) {
                val ip = "$prefix.$i"
                val thread = Thread {
                    try {
                        val socket = Socket()
                        socket.connect(java.net.InetSocketAddress(ip, PORT), TIMEOUT_MS)
                        socket.close()
                        synchronized(lock) {
                            found.add(ip)
                        }
                    } catch (_: Exception) {}
                }
                threads.add(thread)
                thread.start()
            }

            // Attendre que tous les threads finissent (max 5s)
            val timeout = System.currentTimeMillis() + 5000
            for (thread in threads) {
                val remaining = timeout - System.currentTimeMillis()
                if (remaining > 0) {
                    thread.join(remaining)
                } else {
                    thread.interrupt()
                }
            }

            if (found.isNotEmpty()) {
                promise.resolve(found.first())
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
}
