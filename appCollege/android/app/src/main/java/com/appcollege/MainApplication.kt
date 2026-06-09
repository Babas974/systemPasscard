package com.appcollege

import android.app.Application
import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.facebook.react.ReactHost
import com.facebook.react.ReactNativeApplicationEntryPoint.loadReactNative
import com.facebook.react.defaults.DefaultReactHost.getDefaultReactHost
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ViewManager

class MainApplication : Application(), ReactApplication {
    override val reactHost: ReactHost by lazy {
        getDefaultReactHost(
            context = applicationContext,
            packageList = PackageList(this).packages + object : com.facebook.react.ReactPackage {
                override fun createNativeModules(reactContext: ReactApplicationContext): List<NativeModule> {
                    return listOf(NetworkModule(reactContext))
                }
                override fun createViewManagers(reactContext: ReactApplicationContext): List<ViewManager<*, *>> {
                    return emptyList()
                }
            },
        )
    }

    override fun onCreate() {
        super.onCreate()
        loadReactNative(this)
    }
}
