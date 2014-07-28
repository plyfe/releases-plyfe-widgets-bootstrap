(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    //Allow using this built library as an AMD module
    //in another project. That other project will only
    //see this AMD call, not the internal modules in
    //the closure below.
    define([], factory);
  } else {
    // Set the window.Plyfe variable with a amd property
    // to false so we can pick it up inside of the main.js
    // to determine if we were loaded via a true AMD
    // loader or not.
    root.Plyfe = { amd: false };
    //Browser globals case. Just assign the
    //result to a property on the global.
    root.Plyfe = factory();
  }
}(this, function () {
  //almond, and your modules will be inlined here
/**
 * @license almond 0.2.9 Copyright (c) 2011-2014, The Dojo Foundation All Rights Reserved.
 * Available via the MIT or new BSD license.
 * see: http://github.com/jrburke/almond for details
 */
//Going sloppy to avoid 'use strict' string cost, but strict practices should
//be followed.
/*jslint sloppy: true */
/*global setTimeout: false */

var requirejs, require, define;
(function (undef) {
    var main, req, makeMap, handlers,
        defined = {},
        waiting = {},
        config = {},
        defining = {},
        hasOwn = Object.prototype.hasOwnProperty,
        aps = [].slice,
        jsSuffixRegExp = /\.js$/;

    function hasProp(obj, prop) {
        return hasOwn.call(obj, prop);
    }

    /**
     * Given a relative module name, like ./something, normalize it to
     * a real name that can be mapped to a path.
     * @param {String} name the relative name
     * @param {String} baseName a real name that the name arg is relative
     * to.
     * @returns {String} normalized name
     */
    function normalize(name, baseName) {
        var nameParts, nameSegment, mapValue, foundMap, lastIndex,
            foundI, foundStarMap, starI, i, j, part,
            baseParts = baseName && baseName.split("/"),
            map = config.map,
            starMap = (map && map['*']) || {};

        //Adjust any relative paths.
        if (name && name.charAt(0) === ".") {
            //If have a base name, try to normalize against it,
            //otherwise, assume it is a top-level require that will
            //be relative to baseUrl in the end.
            if (baseName) {
                //Convert baseName to array, and lop off the last part,
                //so that . matches that "directory" and not name of the baseName's
                //module. For instance, baseName of "one/two/three", maps to
                //"one/two/three.js", but we want the directory, "one/two" for
                //this normalization.
                baseParts = baseParts.slice(0, baseParts.length - 1);
                name = name.split('/');
                lastIndex = name.length - 1;

                // Node .js allowance:
                if (config.nodeIdCompat && jsSuffixRegExp.test(name[lastIndex])) {
                    name[lastIndex] = name[lastIndex].replace(jsSuffixRegExp, '');
                }

                name = baseParts.concat(name);

                //start trimDots
                for (i = 0; i < name.length; i += 1) {
                    part = name[i];
                    if (part === ".") {
                        name.splice(i, 1);
                        i -= 1;
                    } else if (part === "..") {
                        if (i === 1 && (name[2] === '..' || name[0] === '..')) {
                            //End of the line. Keep at least one non-dot
                            //path segment at the front so it can be mapped
                            //correctly to disk. Otherwise, there is likely
                            //no path mapping for a path starting with '..'.
                            //This can still fail, but catches the most reasonable
                            //uses of ..
                            break;
                        } else if (i > 0) {
                            name.splice(i - 1, 2);
                            i -= 2;
                        }
                    }
                }
                //end trimDots

                name = name.join("/");
            } else if (name.indexOf('./') === 0) {
                // No baseName, so this is ID is resolved relative
                // to baseUrl, pull off the leading dot.
                name = name.substring(2);
            }
        }

        //Apply map config if available.
        if ((baseParts || starMap) && map) {
            nameParts = name.split('/');

            for (i = nameParts.length; i > 0; i -= 1) {
                nameSegment = nameParts.slice(0, i).join("/");

                if (baseParts) {
                    //Find the longest baseName segment match in the config.
                    //So, do joins on the biggest to smallest lengths of baseParts.
                    for (j = baseParts.length; j > 0; j -= 1) {
                        mapValue = map[baseParts.slice(0, j).join('/')];

                        //baseName segment has  config, find if it has one for
                        //this name.
                        if (mapValue) {
                            mapValue = mapValue[nameSegment];
                            if (mapValue) {
                                //Match, update name to the new value.
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

                //Check for a star map match, but just hold on to it,
                //if there is a shorter segment match later in a matching
                //config, then favor over this star map.
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
                name = nameParts.join('/');
            }
        }

        return name;
    }

    function makeRequire(relName, forceSync) {
        return function () {
            //A version of a require function that passes a moduleName
            //value for items that may need to
            //look up paths relative to the moduleName
            return req.apply(undef, aps.call(arguments, 0).concat([relName, forceSync]));
        };
    }

    function makeNormalize(relName) {
        return function (name) {
            return normalize(name, relName);
        };
    }

    function makeLoad(depName) {
        return function (value) {
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
            throw new Error('No ' + name);
        }
        return defined[name];
    }

    //Turns a plugin!resource to [plugin, resource]
    //with the plugin being undefined if the name
    //did not have a plugin prefix.
    function splitPrefix(name) {
        var prefix,
            index = name ? name.indexOf('!') : -1;
        if (index > -1) {
            prefix = name.substring(0, index);
            name = name.substring(index + 1, name.length);
        }
        return [prefix, name];
    }

    /**
     * Makes a name map, normalizing the name, and using a plugin
     * for normalization if necessary. Grabs a ref to plugin
     * too, as an optimization.
     */
    makeMap = function (name, relName) {
        var plugin,
            parts = splitPrefix(name),
            prefix = parts[0];

        name = parts[1];

        if (prefix) {
            prefix = normalize(prefix, relName);
            plugin = callDep(prefix);
        }

        //Normalize according
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

        //Using ridiculous property names for space reasons
        return {
            f: prefix ? prefix + '!' + name : name, //fullName
            n: name,
            pr: prefix,
            p: plugin
        };
    };

    function makeConfig(name) {
        return function () {
            return (config && config.config && config.config[name]) || {};
        };
    }

    handlers = {
        require: function (name) {
            return makeRequire(name);
        },
        exports: function (name) {
            var e = defined[name];
            if (typeof e !== 'undefined') {
                return e;
            } else {
                return (defined[name] = {});
            }
        },
        module: function (name) {
            return {
                id: name,
                uri: '',
                exports: defined[name],
                config: makeConfig(name)
            };
        }
    };

    main = function (name, deps, callback, relName) {
        var cjsModule, depName, ret, map, i,
            args = [],
            callbackType = typeof callback,
            usingExports;

        //Use name if no relName
        relName = relName || name;

        //Call the callback to define the module, if necessary.
        if (callbackType === 'undefined' || callbackType === 'function') {
            //Pull out the defined dependencies and pass the ordered
            //values to the callback.
            //Default to [require, exports, module] if no deps
            deps = !deps.length && callback.length ? ['require', 'exports', 'module'] : deps;
            for (i = 0; i < deps.length; i += 1) {
                map = makeMap(deps[i], relName);
                depName = map.f;

                //Fast path CommonJS standard dependencies.
                if (depName === "require") {
                    args[i] = handlers.require(name);
                } else if (depName === "exports") {
                    //CommonJS module spec 1.1
                    args[i] = handlers.exports(name);
                    usingExports = true;
                } else if (depName === "module") {
                    //CommonJS module spec 1.1
                    cjsModule = args[i] = handlers.module(name);
                } else if (hasProp(defined, depName) ||
                           hasProp(waiting, depName) ||
                           hasProp(defining, depName)) {
                    args[i] = callDep(depName);
                } else if (map.p) {
                    map.p.load(map.n, makeRequire(relName, true), makeLoad(depName), {});
                    args[i] = defined[depName];
                } else {
                    throw new Error(name + ' missing ' + depName);
                }
            }

            ret = callback ? callback.apply(defined[name], args) : undefined;

            if (name) {
                //If setting exports via "module" is in play,
                //favor that over return value and exports. After that,
                //favor a non-undefined return value over exports use.
                if (cjsModule && cjsModule.exports !== undef &&
                        cjsModule.exports !== defined[name]) {
                    defined[name] = cjsModule.exports;
                } else if (ret !== undef || !usingExports) {
                    //Use the return value from the function.
                    defined[name] = ret;
                }
            }
        } else if (name) {
            //May just be an object definition for the module. Only
            //worry about defining if have a module name.
            defined[name] = callback;
        }
    };

    requirejs = require = req = function (deps, callback, relName, forceSync, alt) {
        if (typeof deps === "string") {
            if (handlers[deps]) {
                //callback in this case is really relName
                return handlers[deps](callback);
            }
            //Just return the module wanted. In this scenario, the
            //deps arg is the module name, and second arg (if passed)
            //is just the relName.
            //Normalize module name, if it contains . or ..
            return callDep(makeMap(deps, callback).f);
        } else if (!deps.splice) {
            //deps is a config object, not an array.
            config = deps;
            if (config.deps) {
                req(config.deps, config.callback);
            }
            if (!callback) {
                return;
            }

            if (callback.splice) {
                //callback is an array, which means it is a dependency list.
                //Adjust args if there are dependencies
                deps = callback;
                callback = relName;
                relName = null;
            } else {
                deps = undef;
            }
        }

        //Support require(['a'])
        callback = callback || function () {};

        //If relName is a function, it is an errback handler,
        //so remove it.
        if (typeof relName === 'function') {
            relName = forceSync;
            forceSync = alt;
        }

        //Simulate async callback;
        if (forceSync) {
            main(undef, deps, callback, relName);
        } else {
            //Using a non-zero value because of concern for what old browsers
            //do, and latest browsers "upgrade" to 4 if lower value is used:
            //http://www.whatwg.org/specs/web-apps/current-work/multipage/timers.html#dom-windowtimers-settimeout:
            //If want a value immediately, use require('id') instead -- something
            //that works in almond on the global level, but not guaranteed and
            //unlikely to work in other AMD implementations.
            setTimeout(function () {
                main(undef, deps, callback, relName);
            }, 4);
        }

        return req;
    };

    /**
     * Just drops the config on the floor, but returns req in case
     * the config return value is used.
     */
    req.config = function (cfg) {
        return req(cfg);
    };

    /**
     * Expose module registry for debugging and tooling
     */
    requirejs._defined = defined;

    define = function (name, deps, callback) {

        //This module may not have dependencies
        if (!deps.splice) {
            //deps is not an array, so probably means
            //an object literal or factory function for
            //the value. Adjust args.
            callback = deps;
            deps = [];
        }

        if (!hasProp(defined, name) && !hasProp(waiting, name)) {
            waiting[name] = [name, deps, callback];
        }
    };

    define.amd = {
        jQuery: true
    };
}());

define("../node_modules/almond/almond", function(){});

/*
* @license plyfe-widgets-bootstrap Copyright (c) 2014, Plyfe Inc.
* All Rights Reserved.
* Available via the MIT license.
* see: http://github.com/plyfe/plyfe-widgets-bootstrap/LICENSE for details
*/

/*jshint unused:false */
define('utils',['require'],function(require) {
  

  var head = document.getElementsByTagName('head')[0];
  var _undefined;

  function dataAttr(el, name, defval) {
    return el.getAttribute('data-' + name) || defval;
  }

  function buildQueryString(params) {
    var qs = [];

    objForEach(params || {}, function(name) {
      var value = params[name];
      if(value === _undefined) { return; }
      var part = encodeURIComponent(camelToDashed(name));
      if(value !== null) {
        part += '=' + encodeURIComponent(value);
      }
      qs.push(part);
    });

    return qs.join('&');
  }

  function buildUrl(scheme, domain, port, path, params) {
    switch(scheme) {
      case 'http':
        port = !port || port === 80 ? '': ':' + port;
        break;
      case 'https':
        port = !port || port === 443 ? '': ':' + port;
        break;
    }

    var url = scheme + '://' + (domain || '') + port;
    var qs = buildQueryString(params);

    // remove double '//' from url
    url += (path ? '/' + path : '').replace(/\/{2,}/g, '/');

    // If there is querystring data then prepend a '?'
    url += (qs ? '?' : '') + qs;

    return url;
  }

  var isCorsSupported = false;
  if(window.XMLHttpRequest && 'withCredentials' in new XMLHttpRequest()) {
    isCorsSupported = true;
  }

  function objForEach(obj, callback) {
    for(var name in obj) {
      if(obj.hasOwnProperty(name)) {
        var ret = callback(name, obj[name]);
        if(ret === null) { return; } // allow breaking from loop
      }
    }
  }

  var addEvent = function(obj, name, fn) {
    obj.addEventListener(name, fn, false);
  };

  if(window.attachEvent) {
    addEvent = function(obj, name, fn) {
      var _fn = fn.__attachEventRef = function() {
        var e = window.event;
        e.keyCode = e.which;
        fn(e);
      };
      obj.attachEvent('on' + name, _fn);
    };
  }

  var removeEvent = function(obj, name, fn) {
    obj.removeEventListener(name, fn, false);
  };

  if(window.detachEvent) {
    removeEvent = function(obj, name, fn) {
      obj.detachEvent('on' + name, fn.__attachEventRef);
    };
  }

  // TODO: Use something like this:
  // https://github.com/dperini/ContentLoaded/blob/master/src/contentloaded.js
  var readyCallbacks = [];
  var domLoaded = false;
  function ready(e) {
    if(e && e.type === 'readystatechange' && document.readyState !== 'complete') { return; }

    if(domLoaded) { return; }
    domLoaded = true;

    removeEvent(window, 'load', ready);
    removeEvent(document, 'readystatechange', ready);
    removeEvent(document, 'DOMContentLoaded', ready);

    for(var i = 0; i < readyCallbacks.length; i++) {
      readyCallbacks[i]();
    }
  }

  if(document.readyState === 'complete') {
    ready();
  } else {
    addEvent(window, 'load', ready);
    addEvent(document, 'readystatechange', ready);
    addEvent(document, 'DOMContentLoaded', ready);
  }

  function domReady(callback) {
    if(domLoaded) {
      callback();
    } else {
      readyCallbacks.push(callback);
    }
  }

  function setStyles(el, styles) {
    objForEach(styles, function(name, value) {
      el.style[name] = typeof value === 'number' ? value + 'px' : value;
    });
  }

  function dashedToCamel(input) {
    return (input + '').replace(/-(.)/g, function(match, group1) {
      return group1.toUpperCase();
    });
  }

  function camelToDashed(input) {
    return (input + '').replace(/([A-Z])/g, function(match, group1) {
      return '-' + group1.toLowerCase();
    });
  }

  function customStyleSheet(css, options) {
    options = options || {};
    var sheet = document.createElement('style');
    sheet.type = "text/css";
    sheet.media = 'screen';
    if(options.id) {
      sheet.id = options.id;
    }

    if(sheet.styleSheet) {
      sheet.styleSheet.cssText = css; //IE only
    } else {
      sheet.appendChild(document.createTextNode(css));
    }

    // insert at the top of <head> so later styles can changed by page css.
    head.insertBefore(sheet, head.firstChild);

    return sheet;
  }

  var vendorPrefixMap = {
    '': '',
    'Moz-': '-moz-',
    'webkit-': '-webkit-',
    'Webkit-': '-webkit-',
    'Khtml-': '-khtml-',
    'O-': '-o-',
    'ms-': '-ms-'
  };
  var cssRules = {};
  var tempDiv = document.createElement('div');

  function findSupportedCSSPropertyName(property) {
    var cacheProperty = cssRules[property];
    if(cacheProperty) { return cacheProperty; }

    objForEach(vendorPrefixMap, function(jsPropertyPrefix, cssPropertyPrefix) {
      var jsProperty = dashedToCamel(jsPropertyPrefix + property); // hyphens are capitalized so a 'Moz-' + 'some-rule' = 'MozSomeRule'
      if(typeof tempDiv.style[jsProperty] === 'string') {
        var cssProperty = cssPropertyPrefix + property;
        cssRules[property] = cssProperty;
        return cssProperty;
     }
    });
  }

  function cssRule(property, value) {
    return findSupportedCSSPropertyName(property) + ': ' + value + ';';
  }

  function uniqueString(size) {
    size = +size || 0;
    var s = '';
    while(s.length < size) {
      s += Math.random()
        .toString(36) // convert to base 36 using a-z0-9
        .substring(2); // chop of leading '0.' from Math.random
    }
    return s.substr(0, size);
  }

  function trim(s) {
    return s.replace(/^\s+|\s+$/g, '');
  }

  function addClass(el, name) {
    var classes = trim(el.className).split(/\s+/);
    for(var i = classes.length - 1; i >= 0; i--) {
      var className = classes[i];
      if(className === name) {
        return;
      }
    }
    classes.push(trim(name + ''));
    el.className = classes.join(' ');
  }

  function PlyfeError(message) {
    this.name = 'PlyfeError';
    this.message = (message || '');
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

/*
* @license plyfe-widgets-bootstrap Copyright (c) 2014, Plyfe Inc.
* All Rights Reserved.
* Available via the MIT license.
* see: http://github.com/plyfe/plyfe-widgets-bootstrap/LICENSE for details
*/

/*jshint unused:false */
define('settings',['require'],function(require) {
  

  return {
    scheme: 'https',
    domain: 'plyfe.me',
    port: 443,
    authToken: null,
    selector: '.plyfe-widget',
    theme: null
  };

});

/*
* @license plyfe-widgets-bootstrap Copyright (c) 2014, Plyfe Inc.
* All Rights Reserved.
* Available via the MIT license.
* see: http://github.com/plyfe/plyfe-widgets-bootstrap/LICENSE for details
*/

define('widget',['require','utils','settings'],function(require) {
  

  var utils = require('utils');
  var settings = require('settings');

  var widgets = [];
  var widgetCount = 0;
  var WIDGET_READY_TIMEOUT = 5000;

  var WIDGET_CSS = '' +
    '.plyfe-widget {' +
      'opacity: 0;' +
      'overflow-x: hidden;' +
      utils.cssRule('transition', 'opacity 300ms') +
    '}' +
    '\n' +
    '.plyfe-widget.ready {' +
      'opacity: 1;' +
    '}' +
    '\n' +
    '.plyfe-widget iframe {' +
      'display: block;' +
      'width: 100%;' +
      'height: 100%;' +
      'border-width: 0;' + // NOTE: has to be border-width for IE
      'overflow: hidden;' +
    '}';

  utils.customStyleSheet(WIDGET_CSS, { id: 'plyfe-widget-css' });

  function throwAttrRequired(attr) {
    throw new utils.PlyfeError('data-' + attr + ' attribute required');
  }

  function Widget(el) {
    this.el = el;
    this.venue = utils.dataAttr(el, 'venue');
    this.type  = utils.dataAttr(el, 'type');
    this.id    = utils.dataAttr(el, 'id');

    if(!this.venue) { throwAttrRequired('venue'); }
    if(!this.type) { throwAttrRequired('type'); }
    if(!this.id) { throwAttrRequired('id'); }

    var scheme = utils.dataAttr(el, 'scheme', settings.scheme);
    var domain = utils.dataAttr(el, 'domain', settings.domain);
    var port   = utils.dataAttr(el, 'port', settings.port);

    var height = +utils.dataAttr(el, 'height');
    if(!height) { throwAttrRequired('height'); }

    var path = ['w', this.venue, this.type, this.id];

    var params = {
      theme:      utils.dataAttr(el, 'theme', settings.theme),
      theme_data: utils.dataAttr(el, 'theme-overrides'),
      treatment:  utils.dataAttr(el, 'treatment'),
      height:     height
    };

    if(utils.dataAttr(el, 'transparent-bg')) {
      params.transparent = 'true';
    }

    var url = utils.buildUrl(scheme, domain, port, path.join('/'), params);

    function widgetIsReady() {
      clearTimeout(readyTimeout);
      utils.addClass(el, 'ready');
    }

    var iframeName = 'plyfe-' + (++widgetCount);
    var iframe = document.createElement('iframe');
    iframe.onload = widgetIsReady;
    iframe.name = iframeName;
    iframe.src = url;
    iframe.scrolling = 'no';
    iframe.frameBorder = '0'; // NOTE: For IE <= 8
    iframe.allowTransparency = 'true'; // For IE <= 8
    utils.setStyles(iframe, { height: height });
    this.el.innerHTML = '';
    this.el.appendChild(iframe);
    this.iframe = iframe;
    var readyTimeout = setTimeout(widgetIsReady, WIDGET_READY_TIMEOUT);
  }

  function createWidget(el) {
    if(!el && el.nodeType === 3) { throw new utils.PlyfeError('createWidget() must be called with a DOM element'); }
    // Be defensive against repeated calls to createWidget()
    if(el.firstChild === null || el.firstChild.nodeName !== 'iframe') {
      widgets.push(new Widget(el));
    }
  }

  function destroyWidget(el) {
    if(el.nodeName !== 'iframe') {
      el = el.firstChild;
    }

    if(el && el.nodeName === 'iframe') {
      for(var i = widgets.length - 1; i >= 0; i--) {
        var widget = widgets[i];
        if(widget.iframe === el) {
          widgets.splice(i, 1); // delete the reference from the widgets array.
          el.parentNode.innerHTML = ''; // clean DOM
        }
      }
    }
  }

  function forEach(callback) {
    for(var i = widgets.length - 1; i >= 0; i--) {
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

/*
* @license plyfe-widgets-bootstrap Copyright (c) 2014, Plyfe Inc.
* All Rights Reserved.
* Available via the MIT license.
* see: http://github.com/plyfe/plyfe-widgets-bootstrap/LICENSE for details
*/

define('api',['require','utils','settings'],function(require) {
  

  var utils = require('utils');
  var settings = require('settings');

  // Use a local undefined variable instead of global in case undefined was
  // altered.
  var _undefined;

  function empty() {}

  function buildApiUrl(path) {
    return utils.buildUrl(settings.scheme, settings.domain, settings.port, '/api/' + path);
  }

  function makeApiRequest(method, path, data, options) {
    options = options || {};
    var success = options.onSuccess || empty;
    var error = options.onError || empty;

    method = method.toUpperCase();
    var url = buildApiUrl(path);

    var req = utils.isCorsSupported ? new XMLHttpRequest() : new JSONPRequest();

    req.onreadystatechange = function() {
      if(req.readyState === 4) {
        var data = JSON.parse(req.responseText || '');
        var status = req.status;

        if(status === 0) {
          error({message: 'Request ' + url + ' returned an invalid HTTP status of 0.'}, 0);
        } else {
          if(status >= 200 && status < 400) { // success
            success(data, status);
          } else if(status >= 400) { // error
            error(data, status);
          }
        }
      }
    };

    if(method === 'GET' && data) {
      url += (url.indexOf('?') >= 0 ? '&' : '?') + utils.buildQueryString(data);
    }

    req.open(method, url);

    if(options.withCredentials) {
      req.withCredentials = true;
    }

    if(method === 'POST' && data) {
      req.setRequestHeader('Content-Type','application/json');

      data = JSON.stringify(data);
    }

    req.send(data ? data : null);

    return req;
  }

  // XHR like interface for JSONP
  function JSONPRequest(callbackName) {
    this.el = document.createElement('script');
    this.uniqueCallbackName = callbackName || 'plyfeJsonPCallback_' + utils.uniqueString(10);
  }

  JSONPRequest.prototype.setRequestHeader = function() { };

  JSONPRequest.prototype.open = function(method, url /*, blocking */) {
    this.method = method;
    this.url = url;
  };

  JSONPRequest.prototype.send = function(data) {
    var self = this;

    window[this.uniqueCallbackName] = function(data) {
      // Using a try/catch just in the element has already been removed.
      try {
        // Remove this JSONP callback
        delete window[self.uniqueCallbackName];
      } catch(e) {
        window[self.uniqueCallbackName] = _undefined;
      }

      // NOTE: not a string we don't want to go through all the overhead of
      // calling JSON.stringify on the already parsed JSON - just to turn around
      // and parse it again in the xhr.onload function.
      self.responseText = data;
      self.readyState = 4;
      self.status = data.http_status_code || 200;
      self.onreadystatechange(); // NOTE: we don't pass an event object here.
    };

    // TODO: Investigate how to trap script loading 'onerror's in IE <= 8 which
    // doesn't support script.onerror.

    var params = {
      callback: this.uniqueCallbackName,
      http_method: this.method.toUpperCase()
    };

    if(data) {
      params.http_data = data;
    }

    // NOTE: We are slapping the data on as a manual QS param here because we
    // don't have code inspecting the http_data parameter above yet.
    // TODO: Remove this hack in the future.
    this.el.src = this.url + '?' + utils.buildQueryString(params) + '&' + data;

    utils.head.appendChild(this.el);

    setTimeout(function() {
      // Using a try/catch just in the element has already been removed.
      try {
        utils.head.removeChild(self.el);
      } catch(e) {}
    }, 200); // wait 200ms then remove the <script>
  };

  function get(path, data, options) {
    return makeApiRequest.call(null, 'get', path, data, options);
  }

  function post(path, data, options) {
    return makeApiRequest.call(null, 'post', path, data, options);
  }

  return {
    get: get,
    post: post,
    JSONPRequest: JSONPRequest,
    buildApiUrl: buildApiUrl
  };

});

/*
* @license plyfe-widgets-bootstrap Copyright (c) 2014, Plyfe Inc.
* All Rights Reserved.
* Available via the MIT license.
* see: http://github.com/plyfe/plyfe-widgets-bootstrap/LICENSE for details
*/

define('auth',['require','utils','settings','api'],function(require) {
  

  var utils = require('utils');
  var settings = require('settings');
  var api = require('api');

  var once = false;

  function logIn(callback, errback) {
    if(!settings.authToken) {
      throw new utils.PlyfeError('A authToken must be set before login.');
    }

    if(once) { throw new utils.PlyfeError("login() can only be called once"); }
    once = true;

    var options = {};
    if(callback) { options.onSuccess = callback; }
    if(errback) { options.onError = errback; }

    var params = {
      auth_token: settings.authToken
    };

    api.post('/external_sessions', params, options);
  }

  return {
    logIn: logIn
  };
});

/*
* @license plyfe-widgets-bootstrap Copyright (c) 2014, Plyfe Inc.
* All Rights Reserved.
* Available via the MIT license.
* see: http://github.com/plyfe/plyfe-widgets-bootstrap/LICENSE for details
*/

define('switchboard',['require','utils','widget'],function(require) {
  

  var utils = require('utils');
  var widget = require('widget');

  var MESSAGE_PREFIX = 'plyfe:';
  var ORIGIN = '*';

  function pm(win, name, data) {
    if(!name) { throw new TypeError('Argument name required'); }
    // console.log('pm(', win, ',' + name +', ', JSON.stringify(data),')');
    win.postMessage(MESSAGE_PREFIX + name + '\n' + JSON.stringify(data), ORIGIN);
  }

  function gotMessage(e) {
    // If we get a message but are in a browser with no JSON.parse then ignore.
    if(!window.JSON) { return; }

    var payload = e.data;

    // We don't care what the message's origin is as long as it has the proper
    // prefix.
    var messageForUs = payload.substr(0, MESSAGE_PREFIX.length) === MESSAGE_PREFIX;

    if(messageForUs) {
      var newlinePos = payload.indexOf('\n', MESSAGE_PREFIX.length);
      var name = payload.substring(MESSAGE_PREFIX.length, newlinePos);
      var data = JSON.parse(payload.substr(newlinePos + 1)); // +1 is '\n'

      routeMessage(name, data, e.source);

      // console.log('host recieved data: ', name, ':', data);
    }
  }

  function routeMessage(name, data, sourceWindow) {
    var parts = name.split(':');

    switch(parts[0]) {
      case 'broadcast':
        broadcast(parts.slice(1).join(':'), data, sourceWindow);
        break;

      // TODO: remove later
      case 'sizechanged':
        break;

      // case 'dialog':
      //   dialogMessage(parts[1], data);
      //   break;

      default:
        console.warn("Switchboard recieved a unhandled '" + name + "' message", data);
    }
  }

  // function dialogMessage(action, data) {
  //   switch(action) {
  //     case 'open':
  //       dialog.open(data.src, data.width, data.height);
  //       break;
  //     case 'close':
  //       dialog.close();
  //       break;
  //     default:
  //       console.warn("Switchboard recieved unknown dialog action '" + action + "'", data);
  //   }
  // }

  function broadcast(name, data, sourceWindow) {
    widget.forEach(function(wgt) {
      if(wgt.iframe.contentWindow !== sourceWindow) {
        pm(wgt.iframe.contentWindow, name, data);
      }
    });
  }

  function setup() {
    utils.addEvent(window, 'message', gotMessage);
  }

  return {
    setup: setup,
    postMessage: pm
  };
});

/*
* @license plyfe-widgets-bootstrap Copyright (c) 2014, Plyfe Inc.
* All Rights Reserved.
* Available via the MIT license.
* see: http://github.com/plyfe/plyfe-widgets-bootstrap/LICENSE for details
*/

define('main',['require','utils','settings','widget','auth','switchboard'],function(require) {
  

  var utils = require('utils');
  var settings = require('settings');
  var widget = require('widget');
  var auth = require('auth');
  var switchboard = require('switchboard');

  switchboard.setup();

  var globalInitFnName = 'plyfeAsyncInit';
  // NOTE: Have to use `=== false`. Check build_frags/start.frag for the hack.
  var loadedViaRealAMDLoader = !window.Plyfe || window.Plyfe.amd !== false;

  // Find <script> tag that loaded this code
  var scripts = document.getElementsByTagName('script');
  for(var i = scripts.length - 1; i >= 0; i--) {
    var script = scripts[i];
    if(/\/plyfe-widgets-bootstrap.*?\.js(\?|#|$)/.test(script.src)) {
      settings.authToken = utils.dataAttr(script, 'auth-token', null);
      settings.scheme = utils.dataAttr(script, 'scheme', settings.scheme);
      settings.domain = utils.dataAttr(script, 'domain', settings.domain);
      settings.port = +utils.dataAttr(script, 'port') || settings.port; // '+' casts to int

      settings.theme = utils.dataAttr(script, 'theme');

      globalInitFnName = utils.dataAttr(script, 'init-name', globalInitFnName);
      break;
    }
  }

  // The globalInitFnName and the auto-creation of widgets doesn't make sense in
  // the AMD load case.
  if(!loadedViaRealAMDLoader) {
    utils.domReady(function() {
      if(window[globalInitFnName] && typeof window[globalInitFnName] === 'function') {
        // NOTE: Have to use setTimeout to make sure that the rest of the
        // main.js executes first before we call the callback. If we don't then
        // there is a race condition where the window.Plyfe object won't exist
        // yet.
        setTimeout(window[globalInitFnName], 0);
      } else if(settings.authToken) { // Can login via SSO then load widgets
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
    for(var i = 0; i < divs.length; i++) {
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

    //The modules for your project will be inlined above
    //this snippet. Ask almond to synchronously require the
    //module value for 'main' here and return it as the
    //value to use for the public API for the built file.
    return require('main');
}));
