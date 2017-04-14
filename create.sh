#!/bin/bash
set -x

DIST_DIR=dist

pack() {
    cd $DIST_DIR
    npm pack ./package
}

./compile.sh && pack
