/*
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import ReactDOM from "react-dom";
import {HiPlot, defaultPlugins, HiPlotProps} from "./component";
import React from "react";
import { PersistentStateInURL } from "./lib/savedstate";
import { WebserverDataProvider } from "./dataproviders/webserver";
import { StaticDataProvider } from "./dataproviders/static";
import { UploadDataProvider } from "./dataproviders/upload";


export function build_props(extra?: any): HiPlotProps {
    const searchParams = new URLSearchParams(location.search);
    const darkParam = searchParams.get("hip.dark") ?? searchParams.get("hiplot.dark") ?? searchParams.get("HIPLOT.dark");
    const darkValue = darkParam === null
        ? false
        : (darkParam === "auto" ? null : JSON.parse(darkParam));
    var props = {
        experiment: null,
        persistentState: new PersistentStateInURL("hip"),
        plugins: defaultPlugins,
        comm: null,
        asserts: false,
        dataProvider: WebserverDataProvider,
        dark: darkValue,
        onChange: null,
    };
    if (extra !== undefined) {
        Object.assign(props, extra);
    }
    if (extra.dataProviderName !== undefined) {
        props.dataProvider = {
            'webserver': WebserverDataProvider,
            'upload': UploadDataProvider,
            'none': StaticDataProvider,
        }[extra.dataProviderName];
    }
    if (extra.persistentStateUrlPrefix !== undefined) {
        props.persistentState = new PersistentStateInURL(extra.persistentStateUrlPrefix);
    }
    return props;
}

export function render(element: HTMLElement, extra?: any) {
    return ReactDOM.render(<React.StrictMode><HiPlot {...build_props(extra)} /></React.StrictMode>, element);
}

// Expose global for non-module consumers (legacy HTML templates).
if (typeof window !== "undefined") {
    (window as any).hiplot = {
        render,
        build_props,
    };
}
