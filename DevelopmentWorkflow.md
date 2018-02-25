# Development Workflow

<!-- TOC depthFrom:2 -->

- [Prerequisites](#prerequisites)
- [Develop locally](#develop-locally)

<!-- /TOC -->


## Prerequisites

* Install your native toolchain and NativeScript as [described in the docs](https://docs.nativescript.org/start/quick-setup)

* Review [NativeScript plugins documentation](https://docs.nativescript.org/plugins/plugins) for more details on plugins development


## Develop locally

For local development we recommend using the npm commands provided in the plugin's package.json

Basically executing a bunch of commands will be enough for you to start making changes to the plugin and see them live synced in the demo.

To run and develop using TypeScript demo:
```bash
$ cd nativescript-geolocation/src
$ npm run demo.ios
$ npm run demo.android
```

After all the changes are done make sure to test them in all the demo apps.

For details on plugins development workflow, read [NativeScript plugins documentation](https://docs.nativescript.org/plugins/building-plugins#step-2-set-up-a-development-workflow) covering that topic.