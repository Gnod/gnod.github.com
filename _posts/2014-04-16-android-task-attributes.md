---
layout: post
title: "Android task"
description: ""
category: ""
tags: [android,task]
---
{% include JB/setup %}


- `andriod:clearTaskOnLaunch`

该属性仅对task的Root Activity有效。

当该值为`true`时，用户返回Task时候（如通过Home返回）将清除其余Activity仅仅留下声明该变量的的Root Activity。

如果Root Activity同时声明了该属性与`android:allowTaskPrparenting`属性，并且均为`true`，其余能够re-parented的activities将根据affinity移动到指定task中。

- `android:launchMode`

 standard
    singleTop   如果新启动的Activity在其目标Task的Stack顶部，则不新创建一个Activity，而是复用顶部的Activity，调用其`onNewIntent`方法传入新的`Intent`

    singleTask      仅允许启动于一个Task，但允许其他Activities在该Task中
    singleInstance  仅允许启动于一个Task，并且该Task仅允许该Activity存在，从该Activity中启动的Activities将分配到其它Task中，类似于`Intent.FLAG_ACTIVITY_NEW_TASK`
