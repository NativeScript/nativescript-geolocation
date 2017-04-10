#!/bin/bash

SOURCE_DIR=source;
PACK_DIR=dist/package/;
DIST_DIR=dist;

cd $SOURCE_DIR
npm install 
cd ..

copy_package_files() {
    cp "$SOURCE_DIR"/package.json $PACK_DIR
    cp "$SOURCE_DIR"/*.md $PACK_DIR
	cp "$SOURCE_DIR"/*.d.ts $PACK_DIR
    cp -r "$SOURCE_DIR"/platforms $PACK_DIR
}

#clean dist folder from previous compilation
rm -rf $DIST_DIR

#create package folder
mkdir -p $PACK_DIR

#compile package and copy file required by npm
$SOURCE_DIR/node_modules/.bin/tsc -p $SOURCE_DIR --outDir $PACK_DIR

#tslint
$SOURCE_DIR/node_modules/.bin/tslint --project $SOURCE_DIR/tsconfig.json --config $SOURCE_DIR/tslint.json

copy_package_files
