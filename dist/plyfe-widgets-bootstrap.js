/*!
 * Plyfe Widgets Library v0.5.0
 * http://plyfe.com/
 *
 * Copyright 2014, Plyfe Inc.
 *
 * Available via the MIT license.
 * http://github.com/plyfe/plyfe-widgets-bootstrap/LICENSE
 *
 * Date: 2014-11-20
 */
(function(root, factory) {
    if (typeof define === "function" && define.amd) {
        define([], factory);
    } else {
        if (root.Plyfe) {
            return;
        }
        root.Plyfe = {
            amd: false
        };
        root.Plyfe = factory();
    }
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
                el.style[name] = typeof value === "number" ? value + "px" : value;
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
        function uniqueString(size) {
            size = +size || 0;
            var s = "";
            while (s.length < size) {
                s += Math.random().toString(36).substring(2);
            }
            return s.substr(0, size);
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
            uniqueString: uniqueString,
            trim: trim,
            addClass: addClass,
            PlyfeError: PlyfeError
        };
    });
    define("settings", [ "require" ], function(require) {
        return {
            scheme: "https",
            env: "production",
            domain: "plyfe.me",
            port: 443,
            authToken: null,
            selector: ".plyfe-widget",
            theme: null
        };
    });
    define("env", [ "require" ], function(require) {
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
    define("widget", [ "require", "utils", "settings", "env" ], function(require) {
        var utils = require("utils");
        var settings = require("settings");
        var environments = require("env");
        var widgets = [];
        var widgetCount = 0;
        var WIDGET_CSS = "" + ".plyfe-widget {" + "width: 0;" + "height: 0;" + "opacity: 0;" + "overflow-x: hidden;" + utils.cssRule("transition", "opacity 300ms") + "}" + "\n" + ".plyfe-widget.ready {" + "opacity: 1;" + "}" + "\n" + ".plyfe-widget iframe {" + "display: block;" + "width: 100%;" + "height: 100%;" + "border-width: 0;" + "overflow: hidden;" + "}";
        utils.customStyleSheet(WIDGET_CSS, {
            id: "plyfe-widget-css"
        });
        function throwAttrRequired(attr) {
            throw new utils.PlyfeError("data-" + attr + " attribute required");
        }
        function Widget(el) {
            this.el = el;
            this.slot = utils.dataAttr(el, "slot");
            var path = [];
            var params = {};
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
                params = {
                    theme: utils.dataAttr(el, "theme", settings.theme)
                };
                if (utils.dataAttr(el, "transparent-bg")) {
                    params.transparent = "true";
                }
            }
            var scheme = utils.dataAttr(el, "scheme", settings.scheme);
            var domain = settings.domain;
            var port = settings.port;
            var env = utils.dataAttr(el, "env");
            if (env) {
                domain = environments[env].domain;
                port = environments[env].port;
            }
            domain = utils.dataAttr(el, "domain", domain);
            port = utils.dataAttr(el, "port", port);
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
        Widget.prototype.ready = function widgetReady(width, height) {
            utils.setStyles(this.el, {
                width: width,
                height: height
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
        function forEach(callback) {
            for (var i = widgets.length - 1; i >= 0; i--) {
                callback(widgets[i]);
            }
        }
        return {
            create: createWidget,
            distroy: destroyWidget,
            list: widgets,
            forEach: forEach
        };
    });
    define("api", [ "require", "utils", "settings" ], function(require) {
        var utils = require("utils");
        var settings = require("settings");
        var _undefined;
        function empty() {}
        function buildApiUrl(path) {
            return utils.buildUrl(settings.scheme, settings.domain, settings.port, "/api/" + path);
        }
        function makeApiRequest(method, path, data, options) {
            options = options || {};
            var success = options.onSuccess || empty;
            var error = options.onError || empty;
            method = method.toUpperCase();
            var url = buildApiUrl(path);
            var req = utils.isCorsSupported ? new XMLHttpRequest() : new JSONPRequest();
            req.onreadystatechange = function() {
                if (req.readyState === 4) {
                    var data = JSON.parse(req.responseText || "");
                    var status = req.status;
                    if (status === 0) {
                        error({
                            message: "Request " + url + " returned an invalid HTTP status of 0."
                        }, 0);
                    } else {
                        if (status >= 200 && status < 400) {
                            success(data, status);
                        } else if (status >= 400) {
                            error(data, status);
                        }
                    }
                }
            };
            if (method === "GET" && data) {
                url += (url.indexOf("?") >= 0 ? "&" : "?") + utils.buildQueryString(data);
            }
            req.open(method, url);
            if (options.withCredentials) {
                req.withCredentials = true;
            }
            if (method === "POST" && data) {
                req.setRequestHeader("Content-Type", "application/json");
                data = JSON.stringify(data);
            }
            req.send(data ? data : null);
            return req;
        }
        function JSONPRequest(callbackName) {
            this.el = document.createElement("script");
            this.uniqueCallbackName = callbackName || "plyfeJsonPCallback_" + utils.uniqueString(10);
        }
        JSONPRequest.prototype.setRequestHeader = function() {};
        JSONPRequest.prototype.open = function(method, url) {
            this.method = method;
            this.url = url;
        };
        JSONPRequest.prototype.send = function(data) {
            var self = this;
            window[this.uniqueCallbackName] = function(data) {
                try {
                    delete window[self.uniqueCallbackName];
                } catch (e) {
                    window[self.uniqueCallbackName] = _undefined;
                }
                self.responseText = data;
                self.readyState = 4;
                self.status = data.http_status_code || 200;
                self.onreadystatechange();
            };
            var params = {
                callback: this.uniqueCallbackName,
                http_method: this.method.toUpperCase()
            };
            if (data) {
                params.http_data = data;
            }
            this.el.src = this.url + "?" + utils.buildQueryString(params) + "&" + data;
            utils.head.appendChild(this.el);
            setTimeout(function() {
                try {
                    utils.head.removeChild(self.el);
                } catch (e) {}
            }, 200);
        };
        function get(path, data, options) {
            return makeApiRequest.call(null, "get", path, data, options);
        }
        function post(path, data, options) {
            return makeApiRequest.call(null, "post", path, data, options);
        }
        return {
            get: get,
            post: post,
            JSONPRequest: JSONPRequest,
            buildApiUrl: buildApiUrl
        };
    });
    define("auth", [ "require", "utils", "settings", "api" ], function(require) {
        var utils = require("utils");
        var settings = require("settings");
        var api = require("api");
        var once = false;
        function logIn(callback, errback) {
            if (!settings.authToken) {
                throw new utils.PlyfeError("A authToken must be set before login.");
            }
            if (once) {
                throw new utils.PlyfeError("login() can only be called once");
            }
            once = true;
            var options = {};
            if (callback) {
                options.onSuccess = callback;
            }
            if (errback) {
                options.onError = errback;
            }
            var params = {
                auth_token: settings.authToken
            };
            api.post("/external_sessions", params, options);
        }
        return {
            logIn: logIn
        };
    });
    define("switchboard", [ "require", "utils", "widget" ], function(require) {
        var utils = require("utils");
        var widget = require("widget");
        var MESSAGE_PREFIX = "plyfe:";
        var ORIGIN = "*";
        function pm(win, name, data) {
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
            var messageForUs = payload.substr(0, MESSAGE_PREFIX.length) === MESSAGE_PREFIX;
            if (messageForUs) {
                var newlinePos = payload.indexOf("\n", MESSAGE_PREFIX.length);
                var name = payload.substring(MESSAGE_PREFIX.length, newlinePos);
                var data = JSON.parse(payload.substr(newlinePos + 1));
                routeMessage(name, data, e.source);
            }
        }
        function findWidget(win) {
            var widgets = widget.list;
            for (var i = widgets.length - 1; i >= 0; i--) {
                var wgt = widgets[i];
                if (wgt.iframe.contentWindow === win) {
                    return wgt;
                }
            }
        }
        function routeMessage(name, data, sourceWindow) {
            var parts = name.split(":");
            switch (parts[0]) {
              case "load":
                var wgt = findWidget(sourceWindow);
                wgt.ready(data.width, data.height);
                break;

              case "broadcast":
                broadcast(parts.slice(1).join(":"), data, sourceWindow);
                break;

              case "sizechanged":
                break;

              default:
                console.warn("Switchboard recieved a unhandled '" + name + "' message", data);
            }
        }
        function broadcast(name, data, sourceWindow) {
            widget.forEach(function(wgt) {
                if (wgt.iframe.contentWindow !== sourceWindow) {
                    pm(wgt.iframe.contentWindow, name, data);
                }
            });
        }
        function setup() {
            utils.addEvent(window, "message", gotMessage);
        }
        return {
            setup: setup,
            postMessage: pm
        };
    });
    define("main", [ "require", "utils", "settings", "widget", "auth", "switchboard", "env" ], function(require) {
        var utils = require("utils");
        var settings = require("settings");
        var widget = require("widget");
        var auth = require("auth");
        var switchboard = require("switchboard");
        var environments = require("env");
        switchboard.setup();
        var globalInitFnName = "plyfeAsyncInit";
        var loadedViaRealAMDLoader = !window.Plyfe || window.Plyfe.amd !== false;
        var scripts = document.getElementsByTagName("script");
        for (var i = scripts.length - 1; i >= 0; i--) {
            var script = scripts[i];
            if (/\/plyfe-widgets-bootstrap.*?\.js(\?|#|$)/.test(script.src)) {
                settings.authToken = utils.dataAttr(script, "auth-token", null);
                settings.scheme = utils.dataAttr(script, "scheme", settings.scheme);
                settings.env = utils.dataAttr(script, "env", settings.env);
                var env = environments[settings.env] || environments.production;
                settings.domain = env.domain;
                settings.port = env.port;
                settings.domain = utils.dataAttr(script, "domain", settings.domain);
                settings.port = +utils.dataAttr(script, "port") || settings.port;
                settings.theme = utils.dataAttr(script, "theme");
                globalInitFnName = utils.dataAttr(script, "init-name", globalInitFnName);
                break;
            }
        }
        if (!loadedViaRealAMDLoader) {
            utils.domReady(function() {
                if (window[globalInitFnName] && typeof window[globalInitFnName] === "function") {
                    setTimeout(window[globalInitFnName], 0);
                } else if (settings.authToken) {
                    auth.logIn(function() {
                        createWidgets();
                    });
                } else {
                    createWidgets();
                }
            });
        }
        function createWidgets() {
            var divs = document.querySelectorAll(settings.selector);
            for (var i = 0; i < divs.length; i++) {
                widget.create(divs[i]);
            }
        }
        function createWidget(el) {
            return widget.create(el);
        }
        return {
            settings: settings,
            createWidgets: createWidgets,
            createWidget: createWidget,
            logIn: auth.logIn
        };
    });
    return require("main");
});