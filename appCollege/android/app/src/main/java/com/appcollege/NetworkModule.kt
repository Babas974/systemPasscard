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
import java.util.concurrent.Executors
import java.util.concurrent.CountDownLatch
import java.util.concurrent.TimeUnit
import java.util.concurrent.ConcurrentLinkedQueue

@ReactModule(name = NetworkModule.NAME)
class NetworkModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {
    companion object {
        const val NAME = "NetworkModule"
        private const val PORT = 8389 // SYNC: ApiService.ts, main.rs
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
            val found = ConcurrentLinkedQueue<String>()

            // Pool de 20 threads max (pas 254 simultanes)
            val pool = Executors.newFixedThreadPool(20)
            val latch = CountDownLatch(254)

            for (i in 1..254) {
                pool.submit {
                    try {
                        val ip = "$prefix.$i"
                        val socket = Socket()
                        try {
                            socket.connect(java.net.InetSocketAddress(ip, PORT), TIMEOUT_MS)
                            found.add(ip)
                        } finally {
                            try { socket.close() } catch (_: Exception) {}
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
                promise.resolve(result)
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
