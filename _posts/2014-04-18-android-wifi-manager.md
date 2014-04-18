---
layout: post
title: "Android Wifi Manager"
description: ""
category: ""
tags: [android, wifi manager]
---
{% include JB/setup %}


### WifiManager 获得：

{% highlight java %}
WifiManager wifiMgr = (WifiManager) getSystemService(WIFI_SERVICE);
{% endhighlight %}


要求权限：`android.permission.ACCESS_WIFI_STATE`

#### 连接信息获得：

{% highlight java %}

  WifiInfo info = wifiMgr.getConnectionInfo();

  printLog("ip:" + intToIp(info.getIpAddress()));  // ip地址
  printLog("bssid:" + info.getBSSID());            // 连接路由器mac地址
  printLog("ssid:" + info.getSSID());              // 局域网标识
  printLog("mac Addr:" + info.getMacAddress());    // 手机mac地址
  printLog("network id:" + info.getNetworkId());   // 网络id
  printLog("rssi:" + info.getRssi());              // wifi信号强度

{% endhighlight %}

- WifiManager 对于Rssi阀值控制如下：

  {% highlight java %}
  /** Anything worse than or equal to this will show 0 bars. */
  private static final int MIN_RSSI = -100;

  /** Anything better than or equal to this will show the max bars. */
  private static final int MAX_RSSI = -55;

{% endhighlight %}

#### DHCP信息获得：

{% highlight java %}
  DhcpInfo dhcpInfo = wifiMgr.getDhcpInfo();

  printLog("ip Addr:" + intToIp(dhcpInfo.ipAddress));     // ip地址
  printLog("gateway:" + intToIp(dhcpInfo.gateway));       // 网关
  printLog("dns:" + intToIp(dhcpInfo.dns1) + "|" + intToIp(dhcpInfo.dns2));        // dns， dns2为备用dns
  printLog("server address:" + intToIp(dhcpInfo.serverAddress));      // 服务器ip

{% endhighlight %}

#### 获得扫描到的Wifi信息：

{% highlight java %}
  List<ScanResult> scanResult = wifiMgr.getScanResults();
{% endhighlight %}

一条ScalResult对应一个扫描到的Wifi热点，主要参数有：


    SSID
    DSSID
    capabilities    热点安全描述
    level           信号强弱
    frequency       通信频率



### 获得连接管理对象`ConnectivityManager`

{% highlight java %}

  ConnectivityManager connectionMgr = (ConnectivityManager) getSystemService(CONNECTIVITY_SERVICE);

{% endhighlight %}

网络状态信息获得：

{% highlight java %}

  NetworkInfo networkInfo = connectionMgr.getActiveNetworkInfo();
  NetworkInfo wifiNetworkInfo = connectionMgr.getNetworkInfo(ConnectivityManager.TYPE_WIFI);
  NetworkInfo mobileNetworkInf = connectionMgr.getNetworkInfo(ConnectivityManager.TYPE_MOBILE);

{% endhighlight %}

`NetworkInfo` 参数：

{% highlight java %}

  printLog("详细状态:" + networkInfo.getDetailedState());
  printLog("附加信息:" + networkInfo.getExtraInfo());
  printLog("连接失败原因:" + networkInfo.getReason());
  printLog("网络类型及对应网络名称:" + networkInfo.getType() + " " + networkInfo.getTypeName());
  printLog("网络是否可用:" + networkInfo.isAvailable());
  printLog("网络已连接:" + networkInfo.isConnected());
  printLog("连接或正在连接中:" + networkInfo.isConnectedOrConnecting());
  printLog("是否连接失败:" + networkInfo.isFailover());
  printLog("是否处于漫游:" + networkInfo.isRoaming());

{% endhighlight %}

### 注册网络连接状态监听器：

1. 实现`BroadcastReceiver`子类：

{% highlight java %}

public class NetworkMonitor extends BroadcastReceiver {
    @Override
    public void onReceive(Context context, Intent intent) {
        // do something here
    }
}

{% endhighlight %}


2. 在`AndroidManifest.xml`中声明receiver:

{% highlight xml %}

<receiver android:name="com.gnod.demo.NetworkMonitor" android:label="NetworkMonitor">
        <intent-filter>
            <action android:name="android.net.conn.CONNECTIVITY_CHANGE" />
        </intent-filter>
</receiver>

{% endhighlight %}

### int类型ip转换：

{% highlight java %}
  private String intToIp(int i) {
    return (i & 0xff) + "." + ((i>>8) & 0xff) + "." + ((i >> 16) & 0xff) + "." + ((i >>24) & 0xff);
	}

{% endhighlight %}
