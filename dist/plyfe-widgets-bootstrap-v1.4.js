/*!
 * Plyfe Widgets Library v1.4.0
 * http://plyfe.com/
 *
 * Copyright 2015, Plyfe Inc.
 *
 * Available via the MIT license.
 * http://github.com/plyfe/plyfe-widgets-bootstrap/LICENSE
 *
 * Date: 2015-09-09
 */
(function(root, factory) {
    if (root.Plyfe) {
        return;
    }
    root.Plyfe = factory();
})(this, function() {
    var requirejs, require, define;
    (function(undef) {
        var main, req, makeMap, handlers, defined = {}, waiting = {}, config = {}, defining = {}, hasOwn = Object.prototype.hasOwnProperty, aps = [].slice, jsSuffixRegExp = /\.js$/;
        function hasProp(obj, prop) {
            return hasOwn.call(obj, prop);
        }
        function normalize(name, baseName) {
            var nameParts, nameSegment, mapValue, foundMap, lastIndex, foundI, foundStarMap, starI, i, j, part, baseParts = baseName && baseName.split("/"), map = config.map, starMap = map && map["*"] || {};
            if (name && name.charAt(0) === ".") {
                if (baseName) {
                    baseParts = baseParts.slice(0, baseParts.length - 1);
                    name = name.split("/");
                    lastIndex = name.length - 1;
                    if (config.nodeIdCompat && jsSuffixRegExp.test(name[lastIndex])) {
                        name[lastIndex] = name[lastIndex].replace(jsSuffixRegExp, "");
                    }
                    name = baseParts.concat(name);
                    for (i = 0; i < name.length; i += 1) {
                        part = name[i];
                        if (part === ".") {
                            name.splice(i, 1);
                            i -= 1;
                        } else if (part === "..") {
                            if (i === 1 && (name[2] === ".." || name[0] === "..")) {
                                break;
                            } else if (i > 0) {
                                name.splice(i - 1, 2);
                                i -= 2;
                            }
                        }
                    }
                    name = name.join("/");
                } else if (name.indexOf("./") === 0) {
                    name = name.substring(2);
                }
            }
            if ((baseParts || starMap) && map) {
                nameParts = name.split("/");
                for (i = nameParts.length; i > 0; i -= 1) {
                    nameSegment = nameParts.slice(0, i).join("/");
                    if (baseParts) {
                        for (j = baseParts.length; j > 0; j -= 1) {
                            mapValue = map[baseParts.slice(0, j).join("/")];
                            if (mapValue) {
                                mapValue = mapValue[nameSegment];
                                if (mapValue) {
                                    foundMap = mapValue;
                                    foundI = i;
                                    break;
                                }
                            }
                        }
                    }
                    if (foundMap) {
                        break;
                    }
                    if (!foundStarMap && starMap && starMap[nameSegment]) {
                        foundStarMap = starMap[nameSegment];
                        starI = i;
                    }
                }
                if (!foundMap && foundStarMap) {
                    foundMap = foundStarMap;
                    foundI = starI;
                }
                if (foundMap) {
                    nameParts.splice(0, foundI, foundMap);
                    name = nameParts.join("/");
                }
            }
            return name;
        }
        function makeRequire(relName, forceSync) {
            return function() {
                return req.apply(undef, aps.call(arguments, 0).concat([ relName, forceSync ]));
            };
        }
        function makeNormalize(relName) {
            return function(name) {
                return normalize(name, relName);
            };
        }
        function makeLoad(depName) {
            return function(value) {
                defined[depName] = value;
            };
        }
        function callDep(name) {
            if (hasProp(waiting, name)) {
                var args = waiting[name];
                delete waiting[name];
                defining[name] = true;
                main.apply(undef, args);
            }
            if (!hasProp(defined, name) && !hasProp(defining, name)) {
                throw new Error("No " + name);
            }
            return defined[name];
        }
        function splitPrefix(name) {
            var prefix, index = name ? name.indexOf("!") : -1;
            if (index > -1) {
                prefix = name.substring(0, index);
                name = name.substring(index + 1, name.length);
            }
            return [ prefix, name ];
        }
        makeMap = function(name, relName) {
            var plugin, parts = splitPrefix(name), prefix = parts[0];
            name = parts[1];
            if (prefix) {
                prefix = normalize(prefix, relName);
                plugin = callDep(prefix);
            }
            if (prefix) {
                if (plugin && plugin.normalize) {
                    name = plugin.normalize(name, makeNormalize(relName));
                } else {
                    name = normalize(name, relName);
                }
            } else {
                name = normalize(name, relName);
                parts = splitPrefix(name);
                prefix = parts[0];
                name = parts[1];
                if (prefix) {
                    plugin = callDep(prefix);
                }
            }
            return {
                f: prefix ? prefix + "!" + name : name,
                n: name,
                pr: prefix,
                p: plugin
            };
        };
        function makeConfig(name) {
            return function() {
                return config && config.config && config.config[name] || {};
            };
        }
        handlers = {
            require: function(name) {
                return makeRequire(name);
            },
            exports: function(name) {
                var e = defined[name];
                if (typeof e !== "undefined") {
                    return e;
                } else {
                    return defined[name] = {};
                }
            },
            module: function(name) {
                return {
                    id: name,
                    uri: "",
                    exports: defined[name],
                    config: makeConfig(name)
                };
            }
        };
        main = function(name, deps, callback, relName) {
            var cjsModule, depName, ret, map, i, args = [], callbackType = typeof callback, usingExports;
            relName = relName || name;
            if (callbackType === "undefined" || callbackType === "function") {
                deps = !deps.length && callback.length ? [ "require", "exports", "module" ] : deps;
                for (i = 0; i < deps.length; i += 1) {
                    map = makeMap(deps[i], relName);
                    depName = map.f;
                    if (depName === "require") {
                        args[i] = handlers.require(name);
                    } else if (depName === "exports") {
                        args[i] = handlers.exports(name);
                        usingExports = true;
                    } else if (depName === "module") {
                        cjsModule = args[i] = handlers.module(name);
                    } else if (hasProp(defined, depName) || hasProp(waiting, depName) || hasProp(defining, depName)) {
                        args[i] = callDep(depName);
                    } else if (map.p) {
                        map.p.load(map.n, makeRequire(relName, true), makeLoad(depName), {});
                        args[i] = defined[depName];
                    } else {
                        throw new Error(name + " missing " + depName);
                    }
                }
                ret = callback ? callback.apply(defined[name], args) : undefined;
                if (name) {
                    if (cjsModule && cjsModule.exports !== undef && cjsModule.exports !== defined[name]) {
                        defined[name] = cjsModule.exports;
                    } else if (ret !== undef || !usingExports) {
                        defined[name] = ret;
                    }
                }
            } else if (name) {
                defined[name] = callback;
            }
        };
        requirejs = require = req = function(deps, callback, relName, forceSync, alt) {
            if (typeof deps === "string") {
                if (handlers[deps]) {
                    return handlers[deps](callback);
                }
                return callDep(makeMap(deps, callback).f);
            } else if (!deps.splice) {
                config = deps;
                if (config.deps) {
                    req(config.deps, config.callback);
                }
                if (!callback) {
                    return;
                }
                if (callback.splice) {
                    deps = callback;
                    callback = relName;
                    relName = null;
                } else {
                    deps = undef;
                }
            }
            callback = callback || function() {};
            if (typeof relName === "function") {
                relName = forceSync;
                forceSync = alt;
            }
            if (forceSync) {
                main(undef, deps, callback, relName);
            } else {
                setTimeout(function() {
                    main(undef, deps, callback, relName);
                }, 4);
            }
            return req;
        };
        req.config = function(cfg) {
            return req(cfg);
        };
        requirejs._defined = defined;
        define = function(name, deps, callback) {
            if (!deps.splice) {
                callback = deps;
                deps = [];
            }
            if (!hasProp(defined, name) && !hasProp(waiting, name)) {
                waiting[name] = [ name, deps, callback ];
            }
        };
        define.amd = {
            jQuery: true
        };
    })();
    define("../node_modules/almond/almond", function() {});
    define("utils", [ "require" ], function(require) {
        "use strict";
        var head = document.getElementsByTagName("head")[0];
        var _undefined;
        function dataAttr(el, name, defval) {
            return el.getAttribute("data-" + name) || defval;
        }
        function buildQueryString(params) {
            var qs = [];
            objForEach(params || {}, function(name) {
                var value = params[name];
                if (value === _undefined) {
                    return;
                }
                var part = encodeURIComponent(camelToDashed(name));
                if (value !== null) {
                    part += "=" + encodeURIComponent(value);
                }
                qs.push(part);
            });
            return qs.join("&");
        }
        function buildUrl(scheme, domain, port, path, params) {
            switch (scheme) {
              case "http":
                port = !port || port === 80 ? "" : ":" + port;
                break;

              case "https":
                port = !port || port === 443 ? "" : ":" + port;
                break;
            }
            var url = scheme + "://" + (domain || "") + port;
            var qs = buildQueryString(params);
            url += (path ? "/" + path : "").replace(/\/{2,}/g, "/");
            url += (qs ? "?" : "") + qs;
            return url;
        }
        var isCorsSupported = false;
        if (window.XMLHttpRequest && "withCredentials" in new XMLHttpRequest()) {
            isCorsSupported = true;
        }
        function objForEach(obj, callback) {
            for (var name in obj) {
                if (obj.hasOwnProperty(name)) {
                    var ret = callback(name, obj[name]);
                    if (ret === null) {
                        return;
                    }
                }
            }
        }
        var addEvent = function(obj, name, fn) {
            obj.addEventListener(name, fn, false);
        };
        if (window.attachEvent) {
            addEvent = function(obj, name, fn) {
                var _fn = fn.__attachEventRef = function() {
                    var e = window.event;
                    e.keyCode = e.which;
                    fn(e);
                };
                obj.attachEvent("on" + name, _fn);
            };
        }
        var removeEvent = function(obj, name, fn) {
            obj.removeEventListener(name, fn, false);
        };
        if (window.detachEvent) {
            removeEvent = function(obj, name, fn) {
                obj.detachEvent("on" + name, fn.__attachEventRef);
            };
        }
        var readyCallbacks = [];
        var domLoaded = false;
        function ready(e) {
            if (e && e.type === "readystatechange" && document.readyState !== "complete") {
                return;
            }
            if (domLoaded) {
                return;
            }
            domLoaded = true;
            removeEvent(window, "load", ready);
            removeEvent(document, "readystatechange", ready);
            removeEvent(document, "DOMContentLoaded", ready);
            for (var i = 0; i < readyCallbacks.length; i++) {
                readyCallbacks[i]();
            }
        }
        if (document.readyState === "complete") {
            ready();
        } else {
            addEvent(window, "load", ready);
            addEvent(document, "readystatechange", ready);
            addEvent(document, "DOMContentLoaded", ready);
        }
        function domReady(callback) {
            if (domLoaded) {
                callback();
            } else {
                readyCallbacks.push(callback);
            }
        }
        function setStyles(el, styles) {
            objForEach(styles, function(name, value) {
                if (value !== null && value !== _undefined) {
                    el.style[name] = typeof value === "number" ? value + "px" : value;
                }
            });
        }
        function dashedToCamel(input) {
            return (input + "").replace(/-(.)/g, function(match, group1) {
                return group1.toUpperCase();
            });
        }
        function camelToDashed(input) {
            return (input + "").replace(/([A-Z])/g, function(match, group1) {
                return "-" + group1.toLowerCase();
            });
        }
        function customStyleSheet(css, options) {
            options = options || {};
            var sheet = document.createElement("style");
            sheet.type = "text/css";
            sheet.media = "screen";
            if (options.id) {
                sheet.id = options.id;
            }
            if (sheet.styleSheet) {
                sheet.styleSheet.cssText = css;
            } else {
                sheet.appendChild(document.createTextNode(css));
            }
            head.insertBefore(sheet, head.firstChild);
            return sheet;
        }
        var vendorPrefixMap = {
            "": "",
            "Moz-": "-moz-",
            "webkit-": "-webkit-",
            "Webkit-": "-webkit-",
            "Khtml-": "-khtml-",
            "O-": "-o-",
            "ms-": "-ms-"
        };
        var cssRules = {};
        var tempDiv = document.createElement("div");
        function findSupportedCSSPropertyName(property) {
            var cacheProperty = cssRules[property];
            if (cacheProperty) {
                return cacheProperty;
            }
            for (var jsPropertyPrefix in vendorPrefixMap) {
                if (vendorPrefixMap.hasOwnProperty(jsPropertyPrefix)) {
                    var cssPropertyPrefix = vendorPrefixMap[jsPropertyPrefix];
                    var jsProperty = dashedToCamel(jsPropertyPrefix + property);
                    if (typeof tempDiv.style[jsProperty] === "string") {
                        var cssProperty = cssPropertyPrefix + property;
                        cssRules[property] = cssProperty;
                        return cssProperty;
                    }
                }
            }
            return property;
        }
        function cssRule(property, value) {
            return findSupportedCSSPropertyName(property) + ": " + value + ";";
        }
        function trim(s) {
            return s.replace(/^\s+|\s+$/g, "");
        }
        function addClass(el, name) {
            var classes = trim(el.className).split(/\s+/);
            for (var i = classes.length - 1; i >= 0; i--) {
                var className = classes[i];
                if (className === name) {
                    return;
                }
            }
            classes.push(trim(name + ""));
            el.className = classes.join(" ");
        }
        function PlyfeError(message) {
            this.name = "PlyfeError";
            this.message = message || "";
        }
        PlyfeError.prototype = Error.prototype;
        function objectMerge(obj, defaultObj) {
            var mergedObj = {};
            for (var k in defaultObj || {}) {
                mergedObj[k] = defaultObj[k];
            }
            for (var j in obj || {}) {
                mergedObj[j] = obj[j];
            }
            return mergedObj;
        }
        return {
            head: head,
            dataAttr: dataAttr,
            buildQueryString: buildQueryString,
            buildUrl: buildUrl,
            isCorsSupported: isCorsSupported,
            objForEach: objForEach,
            addEvent: addEvent,
            removeEvent: removeEvent,
            domReady: domReady,
            setStyles: setStyles,
            dashedToCamel: dashedToCamel,
            camelToDashed: camelToDashed,
            customStyleSheet: customStyleSheet,
            cssRule: cssRule,
            trim: trim,
            addClass: addClass,
            PlyfeError: PlyfeError,
            objectMerge: objectMerge
        };
    });
    define("settings", [ "require" ], function(require) {
        "use strict";
        return {
            env: "production",
            scheme: "https",
            domain: "plyfe.me",
            port: 443,
            selector: ".plyfe-widget"
        };
    });
    define("env", [ "require" ], function(require) {
        "use strict";
        return {
            production: {
                domain: "plyfe.me",
                port: 443
            },
            staging: {
                domain: "staging.plyfe.me",
                port: 443
            },
            demo: {
                domain: "demo.plyfe.me",
                port: 443
            },
            test: {
                domain: "test.plyfe.me",
                port: 443
            },
            development: {
                domain: "development.plyfe.me",
                port: 3001
            }
        };
    });
    define("switchboard", [ "require", "utils" ], function(require) {
        "use strict";
        var utils = require("utils");
        var MESSAGE_PREFIX = "plyfe:";
        var ORIGIN = "*";
        var events = {};
        function pm(data, name, win) {
            if (!name) {
                throw new TypeError("Argument name required");
            }
            win.postMessage(MESSAGE_PREFIX + name + "\n" + JSON.stringify(data), ORIGIN);
        }
        function gotMessage(e) {
            if (!window.JSON) {
                return;
            }
            var payload = e.data;
            if (typeof payload !== "string") {
                return;
            }
            var messageForUs = payload.substr(0, MESSAGE_PREFIX.length) === MESSAGE_PREFIX;
            if (messageForUs) {
                var newlinePos = payload.indexOf("\n", MESSAGE_PREFIX.length);
                var name = payload.substring(MESSAGE_PREFIX.length, newlinePos);
                var data = JSON.parse(payload.substr(newlinePos + 1));
                routeMessage(data, name, e.source);
            }
        }
        function findEventHandlers() {
            var handlers = [];
            for (var i = 0; i < arguments.length; i++) {
                var arg = arguments[i];
                handlers = handlers.concat(events[arg] || []);
            }
            return handlers;
        }
        function routeMessage(data, name, sourceWindow) {
            var parts = name.split(":");
            var handlers = findEventHandlers(name, events[parts[0] + ":*"], "*");
            for (var i = 0; i < handlers.length; i++) {
                handlers[i](data, name, sourceWindow);
            }
            if (handlers.length === 0) {
                console.warn("Switchboard recieved a unhandled '" + name + "' message", data);
            }
        }
        function addListener(name, callback) {
            if (typeof callback !== "function") {
                throw new TypeError("second argument must be a function");
            }
            var listeners = events[name] = events[name] || [];
            listeners.push(callback);
        }
        function removeListener(name, callback) {
            if (callback) {
                var handlers = events[name] || [];
                for (var i = handlers.length - 1; i >= 0; i--) {
                    if (handlers[i] === callback) {
                        handlers.splice(i, 1);
                    }
                }
            } else {
                delete events[name];
            }
        }
        function setup() {
            utils.addEvent(window, "message", gotMessage);
        }
        return {
            setup: setup,
            send: pm,
            on: addListener,
            off: removeListener,
            events: events
        };
    });
    define("widget", [ "require", "utils", "settings", "env", "switchboard" ], function(require) {
        "use strict";
        var utils = require("utils");
        var settings = require("settings");
        var environments = require("env");
        var switchboard = require("switchboard");
        var widgets = [];
        var widgetCount = 0;
        var WIDGET_CSS = "" + ".plyfe-widget {" + "height: 0;" + "opacity: 0;" + "overflow-x: hidden;" + utils.cssRule("transition", "opacity 300ms") + "}" + "\n" + ".plyfe-widget.ready {" + "opacity: 1;" + "}" + "\n" + ".plyfe-widget iframe {" + "display: block;" + "width: 100%;" + "height: 100%;" + "border-width: 0;" + "overflow: hidden;" + "}";
        utils.customStyleSheet(WIDGET_CSS, {
            id: "plyfe-widget-css"
        });
        function findWidgetFromSourceWindow(sourceWindow) {
            for (var i = widgets.length - 1; i >= 0; i--) {
                var wgt = widgets[i];
                if (wgt.iframe.contentWindow === sourceWindow) {
                    return wgt;
                }
            }
        }
        function broadcast(data, name, sourceWindow) {
            var broadcastPrefix = "broadcast:";
            for (var i = 0; i < widgets.length; i++) {
                var wgt = widgets[i];
                if (wgt.iframe.contentWindow !== sourceWindow) {
                    var eventName = name.substr(broadcastPrefix.length);
                    switchboard.send(data, eventName, wgt.iframe.contentWindow);
                }
            }
        }
        function throwAttrRequired(attr) {
            throw new utils.PlyfeError("data-" + attr + " attribute required");
        }
        function Widget(el) {
            this.el = el;
            this.slot = utils.dataAttr(el, "slot");
            var path = [];
            var params = {};
            var scheme = utils.dataAttr(el, "scheme", settings.scheme);
            if (this.slot) {
                path = [ "s", this.slot ];
            } else {
                this.type = utils.dataAttr(el, "type");
                this.id = utils.dataAttr(el, "id");
                if (!this.type) {
                    throwAttrRequired("type");
                }
                if (!this.id) {
                    throwAttrRequired("id");
                }
                path = [ "w", this.type, this.id ];
            }
            if (utils.dataAttr(el, "transparent-bg")) {
                params.transparent = "true";
            }
            var domain = settings.domain;
            var port = settings.port;
            var env = utils.dataAttr(el, "env");
            if (env) {
                domain = environments[env].domain;
                port = environments[env].port;
            }
            domain = utils.dataAttr(el, "domain", domain);
            port = utils.dataAttr(el, "port", port);
            var customId = utils.dataAttr(el, "custom-id");
            if (customId) {
                params.custom_id = customId;
            }
            var url = utils.buildUrl(scheme, domain, port, path.join("/"), params);
            var iframeName = "plyfe-" + ++widgetCount;
            var iframe = document.createElement("iframe");
            iframe.name = iframeName;
            iframe.src = url;
            iframe.scrolling = "no";
            iframe.frameBorder = "0";
            iframe.allowTransparency = "true";
            this.el.innerHTML = "";
            this.el.appendChild(iframe);
            this.iframe = iframe;
        }
        Widget.prototype.ready = function widgetReady(data) {
            utils.setStyles(this.el, {
                minWidth: data.minWidth,
                maxWidth: data.maxWidth,
                height: data.height,
                minHeight: data.minHeight
            });
            utils.addClass(this.el, "ready");
        };
        function createWidget(el) {
            if (!el && el.nodeType === 3) {
                throw new utils.PlyfeError("createWidget() must be called with a DOM element");
            }
            if (el.firstChild === null || el.firstChild.nodeName !== "iframe") {
                widgets.push(new Widget(el));
            }
        }
        function destroyWidget(el) {
            if (el.nodeName !== "iframe") {
                el = el.firstChild;
            }
            if (el && el.nodeName === "iframe") {
                for (var i = widgets.length - 1; i >= 0; i--) {
                    var widget = widgets[i];
                    if (widget.iframe === el) {
                        widgets.splice(i, 1);
                        el.parentNode.innerHTML = "";
                    }
                }
            }
        }
        switchboard.on("broadcast:*", broadcast);
        switchboard.on("load", function loadEvent(data, name, sourceWindow) {
            findWidgetFromSourceWindow(sourceWindow).ready(data);
        });
        switchboard.on("height", function heightChanged(height, name, sourceWindow) {
            utils.setStyles(findWidgetFromSourceWindow(sourceWindow).el, {
                height: height
            });
        });
        return {
            create: createWidget,
            distroy: destroyWidget,
            list: widgets
        };
    });
    define("main", [ "require", "utils", "settings", "widget", "switchboard", "env" ], function(require) {
        "use strict";
        var utils = require("utils");
        var settings = require("settings");
        var widget = require("widget");
        var switchboard = require("switchboard");
        var environments = require("env");
        switchboard.setup();
        var globalInitFnName = "plyfeAsyncInit";
        var scripts = document.getElementsByTagName("script");
        for (var i = scripts.length - 1; i >= 0; i--) {
            var script = scripts[i];
            if (/\/plyfe-widgets-bootstrap.*?\.js(\?|#|$)/.test(script.src)) {
                settings.scheme = utils.dataAttr(script, "scheme", settings.scheme);
                settings.env = utils.dataAttr(script, "env", settings.env);
                var env = environments[settings.env] || environments.production;
                settings.domain = env.domain;
                settings.port = env.port;
                settings.domain = utils.dataAttr(script, "domain", settings.domain);
                settings.port = +utils.dataAttr(script, "port") || settings.port;
                globalInitFnName = utils.dataAttr(script, "init-name", globalInitFnName);
                break;
            }
        }
        utils.domReady(function() {
            if (window[globalInitFnName] && typeof window[globalInitFnName] === "function") {
                setTimeout(window[globalInitFnName], 0);
            } else {
                createWidgets();
            }
        });
        function createWidgets() {
            var divs = document.querySelectorAll(settings.selector);
            for (var i = 0; i < divs.length; i++) {
                widget.create(divs[i]);
            }
        }
        function createWidget(el) {
            return widget.create(el);
        }
        function cardEvent(data, eventName) {
            var user = utils.objectMerge(data.user, {
                id: 0
            });
            var card = utils.objectMerge(data.card, {
                id: 0,
                type: "no_type"
            });
            plyfeObj["onCard" + eventName].call(plyfeObj, card, user);
        }
        function choiceEvent(data, eventName) {
            var user = utils.objectMerge(data.user, {
                id: 0
            });
            var card = utils.objectMerge(data.card, {
                id: 0,
                type: "no_type"
            });
            var choice = utils.objectMerge(data.choice, {
                id: 0,
                name: "no_name",
                correct: null
            });
            plyfeObj["onChoice" + eventName].call(plyfeObj, card, user, choice);
        }
        switchboard.on("card:start", function(data) {
            cardEvent(data, "Start");
        });
        switchboard.on("card:complete", function(data) {
            cardEvent(data, "Complete");
        });
        switchboard.on("choice:selection", function(data) {
            choiceEvent(data, "Selection");
        });
        var onCardStart = window.Plyfe && window.Plyfe.onCardStart || function() {};
        var onCardComplete = window.Plyfe && window.Plyfe.onCardComplete || function() {};
        var onChoiceSelection = window.Plyfe && window.Plyfe.onChoiceSelection || function() {};
        var plyfeObj = {
            settings: settings,
            createWidgets: createWidgets,
            createWidget: createWidget,
            onCardStart: onCardStart,
            onCardComplete: onCardComplete,
            onChoiceSelection: onChoiceSelection
        };
        return plyfeObj;
    });
    return require("main");
});