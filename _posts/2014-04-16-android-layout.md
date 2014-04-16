---
layout: post
title: "Android 布局优化"
description: ""
category: ""
tags: [Android,layout]
---
{% include JB/setup %}

### `<include />`实现布局复用:
定义复用布局xml文件,如定义一名为`layout_statusbar.xml`用做各视图导航栏:


    <?xml version="1.0" encoding="utf-8"?>
    <LinearLayout xmlns:android="http://schemas.android.com/apk/res/android"
        android:orientation="vertical"
        android:layout_width="match_parent"
        android:background="#00ffaa"
        android:layout_height="48dp"
        >
    </LinearLayout>


在需要复用布局的xml文件中使用`<include />`标签引入:


    <?xml version="1.0" encoding="utf-8"?>
    <FrameLayout xmlns:android="http://schemas.android.com/apk/res/android"
        android:orientation="vertical"
        android:layout_width="match_parent"
        android:layout_height="match_parent">
        <include layout="@layout/layout_statusbar"
            />
    </FrameLayout>


重点在于，
- `<include />`标签中可以指定与复用布局xml根layout相同的标签属性，如`layout_width`、`layout_height`等。
- 布局时，如果`<include />`标签中定义的属性将覆盖引入布局中定义属性。
- `include_xxx`相关属性在`<include />`标签中要求同时指定了`layout_width`与`layout_height`才覆盖引入布局中指定属性，否则将以布局内部属性为标准。

### <merge />
系统layout过程中，会在xml布局外围添加一层`FrameLayout`，`<merge />`标签能够避免双层`FrameLayout`。如上面布局文件其Tree View结构为:

    FrameLayout->FrameLayout->LinearLayout(include tag 内部layout)

对于：


    <?xml version="1.0" encoding="utf-8"?>
    <merge xmlns:android="http://schemas.android.com/apk/res/android"
        android:orientation="vertical"
        android:layout_width="match_parent"
        android:layout_height="match_parent">

        <include layout="@layout/layout_statusbar"
            />
    </merge>


其Tree View结构为：

    FrameLayout->LinearLayout
