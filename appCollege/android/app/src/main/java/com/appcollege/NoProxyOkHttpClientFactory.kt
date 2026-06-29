package com.appcollege

import com.facebook.react.modules.network.OkHttpClientFactory
import okhttp3.OkHttpClient
import okhttp3.Protocol
import java.net.Proxy
import java.util.concurrent.TimeUnit

class NoProxyOkHttpClientFactory : OkHttpClientFactory {
    override fun createNewNetworkModuleClient(): OkHttpClient {
        val baseBuilder = OkHttpClient.Builder()
            .readTimeout(30, TimeUnit.SECONDS)
            .writeTimeout(30, TimeUnit.SECONDS)
            .connectTimeout(15, TimeUnit.SECONDS)
            .retryOnConnectionFailure(true)
            .protocols(listOf(Protocol.HTTP_1_1, Protocol.HTTP_2))

        baseBuilder.proxySelector(object : java.net.ProxySelector() {
            override fun select(uri: java.net.URI): List<Proxy> {
                val host = uri.host ?: return listOf(Proxy.NO_PROXY)
                if (isLocalAddress(host)) {
                    return listOf(Proxy.NO_PROXY)
                }
                val sysProxy = java.net.ProxySelector.getDefault()?.select(uri)
                if (!sysProxy.isNullOrEmpty()) {
                    return sysProxy
                }
                return listOf(Proxy.NO_PROXY)
            }

            override fun connectFailed(uri: java.net.URI?, sa: java.net.SocketAddress?, ioe: java.io.IOException?) {
                if (uri != null && isLocalAddress(uri.host ?: "")) {
                    return
                }
            }

            private fun isLocalAddress(host: String): Boolean {
                if (host == "localhost" || host == "127.0.0.1" || host == "::1") return true
                if (!host.matches(Regex("^192\\.168\\..*"))) return false
                if (host == "192.168.224.1") return false
                return true
            }
        })

        return baseBuilder.build()
    }
}
