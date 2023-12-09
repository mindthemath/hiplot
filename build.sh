rm -rf hiplot/static/built/*
rm -rf dist && mkdir dist pypi-build
mkdir -p npm-build/dist npm-build/dist-dev dist
cp .circleci/hotfixes/internmap.js node_modules/internmap/src/index.js
npm run build-dev
mv dist/* npm-build/dist-dev/
npm run build
npm run prepublish
mv dist/* npm-build/dist/ && mkdir -p hiplot/static/built/ && cp npm-build/dist/hiplot.bundle.js hiplot/static/built/

mkdir -p npm-package/hiplot

cp -r package.json tsconfig.json webpack.config.js README.md LICENSE src npm-build/dist npm-package/hiplot
rm -rf npm-package/hiplot/dist/hiplot-*  # Leftover from setup.py
python setup.py sdist bdist_wheel
