var capacitorInAppBrowser = (function (exports, core) {
    'use strict';

    exports.BackgroundColor = void 0;
    (function (BackgroundColor) {
        BackgroundColor["WHITE"] = "white";
        BackgroundColor["BLACK"] = "black";
    })(exports.BackgroundColor || (exports.BackgroundColor = {}));
    exports.ToolBarType = void 0;
    (function (ToolBarType) {
        /**
         * Shows a simple toolbar with just a close button and share button
         * @since 0.1.0
         */
        ToolBarType["ACTIVITY"] = "activity";
        /**
         * Shows a simple toolbar with just a close button
         * @since 7.6.8
         */
        ToolBarType["COMPACT"] = "compact";
        /**
         * Shows a full navigation toolbar with back/forward buttons
         * @since 0.1.0
         */
        ToolBarType["NAVIGATION"] = "navigation";
        /**
         * Shows no toolbar
         * @since 0.1.0
         */
        ToolBarType["BLANK"] = "blank";
    })(exports.ToolBarType || (exports.ToolBarType = {}));
    exports.InvisibilityMode = void 0;
    (function (InvisibilityMode) {
        /**
         * WebView is aware it is hidden (dimensions may be zero).
         */
        InvisibilityMode["AWARE"] = "AWARE";
        /**
         * WebView is hidden but reports fullscreen dimensions (uses alpha=0 to remain invisible).
         */
        InvisibilityMode["FAKE_VISIBLE"] = "FAKE_VISIBLE";
    })(exports.InvisibilityMode || (exports.InvisibilityMode = {}));
    exports.CloseAction = void 0;
    (function (CloseAction) {
        /**
         * The toolbar close button closes and destroys the webview.
         */
        CloseAction["CLOSE"] = "close";
        /**
         * The toolbar close button hides the webview so it can be shown again.
         */
        CloseAction["HIDE"] = "hide";
    })(exports.CloseAction || (exports.CloseAction = {}));

    const CAPGO_PLUGIN_NAME = 'CapgoInAppBrowser';
    const PREVIOUS_PLUGIN_NAME = 'InAppBrowser';
    function resolvePluginName() {
        if (!core.Capacitor.isNativePlatform()) {
            return CAPGO_PLUGIN_NAME;
        }
        if (core.Capacitor.isPluginAvailable(CAPGO_PLUGIN_NAME)) {
            return CAPGO_PLUGIN_NAME;
        }
        if (core.Capacitor.isPluginAvailable(PREVIOUS_PLUGIN_NAME)) {
            return PREVIOUS_PLUGIN_NAME;
        }
        console.warn(`[InAppBrowser] Neither '${CAPGO_PLUGIN_NAME}' nor '${PREVIOUS_PLUGIN_NAME}' native plugin detected. ` +
            'Ensure @capgo/capacitor-inappbrowser native code is installed.');
        return CAPGO_PLUGIN_NAME;
    }
    const inAppBrowserImplementations = {
        web: () => Promise.resolve().then(function () { return web; }).then((m) => new m.InAppBrowserWeb()),
    };
    const InAppBrowser = core.registerPlugin(resolvePluginName(), inAppBrowserImplementations);
    function arrayBufferToBase64(buffer) {
        const bytes = new Uint8Array(buffer);
        let binary = '';
        for (let i = 0; i < bytes.byteLength; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return btoa(binary);
    }
    function headersToRecord(headers) {
        const result = {};
        headers.forEach((value, key) => {
            result[key] = value;
        });
        return result;
    }
    function errorMessage(error) {
        if (error instanceof Error) {
            return error.message;
        }
        if (typeof error === 'string') {
            return error;
        }
        if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') {
            return error.message;
        }
        return String(error);
    }
    function isStaleProxyResponseError(error) {
        const message = errorMessage(error);
        return message.includes('No proxy handler found') || message.includes('Target WebView not found for proxy request');
    }
    function isProxyResponse(value) {
        return (value !== null &&
            typeof value === 'object' &&
            'status' in value &&
            'headers' in value &&
            !(value instanceof Response));
    }
    function isProxyRequestOverride(value) {
        return value !== null && typeof value === 'object' && 'url' in value && !(value instanceof Response);
    }
    function isProxyDecision(value) {
        return (value !== null && typeof value === 'object' && ('request' in value || 'response' in value || 'cancel' in value));
    }
    async function sendProxyDecision(requestId, webviewId, decision, phase) {
        try {
            await InAppBrowser.handleProxyRequest({
                requestId,
                webviewId,
                decision,
                phase,
            });
        }
        catch (error) {
            if (isStaleProxyResponseError(error)) {
                return;
            }
            throw error;
        }
    }
    const addProxyHandler = (callback) => {
        return InAppBrowser.addListener('proxyRequest', async (event) => {
            let decision = null;
            try {
                const result = await callback(event);
                if (result === null) {
                    decision = null;
                }
                else if (isProxyDecision(result)) {
                    decision = result;
                }
                else if (isProxyRequestOverride(result)) {
                    decision = { request: result };
                }
                else if (isProxyResponse(result)) {
                    decision = { response: result };
                }
                else {
                    const cloned = result.clone();
                    const buffer = await cloned.arrayBuffer();
                    decision = {
                        response: {
                            body: arrayBufferToBase64(buffer),
                            status: result.status,
                            headers: headersToRecord(result.headers),
                        },
                    };
                }
            }
            catch (_error) {
                decision = null;
            }
            await sendProxyDecision(event.requestId, event.webviewId, decision, event.phase);
        });
    };

    class InAppBrowserWeb extends core.WebPlugin {
        clearAllCookies() {
            console.log('clearAllCookies');
            return Promise.resolve();
        }
        clearCache() {
            console.log('clearCache');
            return Promise.resolve();
        }
        clearAllBrowsingData() {
            console.log('clearAllBrowsingData');
            return Promise.resolve();
        }
        async open(options) {
            console.log('open', options);
            return options;
        }
        async clearCookies(options) {
            console.log('cleanCookies', options);
            return;
        }
        async getCookies(options) {
            // Web implementation to get cookies
            return options;
        }
        async openWebView(options) {
            console.log('openWebView', options);
            return options;
        }
        async executeScript({ code }) {
            console.log('code', code);
            return code;
        }
        async close(options) {
            console.log('close', options);
            return;
        }
        async hide(options) {
            console.log('hide', options);
            return;
        }
        async show(options) {
            console.log('show', options);
            return;
        }
        async sendToBack(options) {
            console.log('sendToBack not supported on web', options);
            return;
        }
        async bringToFront(options) {
            console.log('bringToFront not supported on web', options);
            return;
        }
        async dispatchInputEvent(options) {
            console.log('dispatchInputEvent not supported on web', options);
            return;
        }
        async setUrl(options) {
            console.log('setUrl', options.url);
            return;
        }
        async reload(options) {
            console.log('reload', options);
            return;
        }
        async postMessage(options) {
            console.log('postMessage', options);
            return options;
        }
        async takeScreenshot(options) {
            console.log('takeScreenshot not supported on web', options);
            throw this.unimplemented('Screenshots are not supported on web.');
        }
        async goBack() {
            console.log('goBack');
            return;
        }
        async getPluginVersion() {
            return { version: 'web' };
        }
        async updateDimensions(options) {
            console.log('updateDimensions', options);
            // Web platform doesn't support dimension control
            return;
        }
        async handleProxyRequest(options) {
            console.log('handleProxyRequest not supported on web', options);
            return;
        }
        async setEnabledSafeTopMargin(options) {
            console.log('setEnabledSafeTopMargin not supported on web', options);
            return;
        }
        async setEnabledSafeBottomMargin(options) {
            console.log('setEnabledSafeBottomMargin not supported on web', options);
            return;
        }
        async openSecureWindow(options) {
            const w = 600;
            const h = 550;
            const settings = [
                ['width', w],
                ['height', h],
                ['left', screen.width / 2 - w / 2],
                ['top', screen.height / 2 - h / 2],
            ]
                .map((x) => x.join('='))
                .join(',');
            const popup = window.open(options.authEndpoint, 'Authorization', settings);
            if (!popup) {
                throw new Error('Failed to open secure window');
            }
            if (typeof popup.focus === 'function') {
                popup.focus();
            }
            return new Promise((resolve, reject) => {
                const bc = new BroadcastChannel(options.broadcastChannelName || 'oauth-channel');
                bc.addEventListener('message', (event) => {
                    if (event.data.startsWith(options.redirectUri)) {
                        bc.close();
                        resolve({ redirectedUri: event.data });
                    }
                    else {
                        bc.close();
                        reject(new Error('Redirect URI does not match, expected ' + options.redirectUri + ' but got ' + event.data));
                    }
                });
                setTimeout(() => {
                    bc.close();
                    reject(new Error('The sign-in flow timed out'));
                }, 5 * 60000);
            });
        }
    }

    var web = /*#__PURE__*/Object.freeze({
        __proto__: null,
        InAppBrowserWeb: InAppBrowserWeb
    });

    exports.InAppBrowser = InAppBrowser;
    exports.addProxyHandler = addProxyHandler;

    return exports;

})({}, capacitorExports);
//# sourceMappingURL=plugin.js.map
