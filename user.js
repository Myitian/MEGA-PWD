// ==UserScript==
// @name         MEGA Print Working Directory
// @namespace    net.myitian.js.mega.pwd
// @description  Show current location in title when using MEGA cloud storage.
// @source       https://github.com/Myitian/MEGA-PWD
// @author       Myitian
// @license      MIT
// @version      0.1
// @match        https://mega.nz/*
// @grant        GM_registerMenuCommand
// ==/UserScript==

/** @param {string} selector */
function simpleCallback(selector) {
    const title = document.title.trim();
    if (title.length === 0) {
        return;
    }
    if (baseTitle === null || /^[^\|]+MEGA[^\|]+$/.test(title)) {
        baseTitle = title;
    }
    const dlkey = document.querySelector(".dlkey-dialog:not(.hidden)");
    /** @type {HTMLElement} */
    const element = dlkey ? dlkey.querySelector("#dlkey-dialog-title") : document.querySelector(selector);
    mName = element?.innerText.replace("\n", "") ?? "";
    const newTitle = `${mName} | ${baseTitle}`.trim();
    if (title !== newTitle) {
        document.title = newTitle;
    }
}
function folderCallback() {
    const title = document.title.trim();
    if (baseTitle === null || /^[^\|]+MEGA[^\|]+$/.test(title)) {
        baseTitle = title;
    }
    if (title.length === 0) {
        return;
    }
    const dlkey = document.querySelector(".dlkey-dialog:not(.hidden)");
    if (dlkey) {
        /** @type {HTMLElement} */
        const dlkeyTitle = dlkey.querySelector("#dlkey-dialog-title");
        mName = dlkeyTitle?.innerText.replace("\n", "") ?? "";
    } else {
        mName = "";
        /** @type {NodeListOf<HTMLElement>} */
        const es = document.querySelectorAll(".fm-right-files-block .breadcrumb-dropdown span");
        if (es.length > 0) {
            for (const e of es) {
                mName = `${e.innerText.trim()}/${mName}`;
            }
            /** @type {HTMLElement} */
            const element = document.querySelector(".fm-right-files-block .fm-breadcrumbs-block a:last-child .simpletip-tc");
            mName += element?.innerText;
        } else {
            /** @type {NodeListOf<HTMLElement>} */
            const es2 = document.querySelectorAll(".fm-right-files-block .fm-breadcrumbs-block .simpletip-tc");
            for (let i = 0; i < es2.length; i++) {
                mName += es2[i].innerText.trim();
                if (i < es2.length - 1) {
                    mName += "/";
                }
            }
        }
    }
    const newTitle = `${mName} | ${baseTitle}`.trim();
    if (title !== newTitle) {
        document.title = newTitle;
    }
}
/** @param {number} t */
function sleep(t) {
    return new Promise((rs, _) => setTimeout(rs, t));
}

/** @typedef {"password"|"file"|"folder"|"fm"|"fm-chat"|"fm-contacts"|"fm-pwm"|"fm-account"|"fm-shares"|null} Mode */

/** @type {MutationObserverInit} */
const OBSERVER_CONFIG = { attributes: true, childList: true, subtree: true };
GM_registerMenuCommand("PWD", () => prompt("Value", mName));
let forceRefresh = false;
let mName = null;
let element = null;
let baseTitle = null;
/** @type {MutationObserver|null} */
let observer = null;
/** @type {Mode} */
let prevMode = null;
main();

async function main() {
    /** @type {Mode} */
    let mode = null;
    if (location.hash.startsWith("#P!")) {
        mode = "password";
    } else if (location.pathname.startsWith("/file/")) {
        mode = "file";
    } else if (location.pathname.startsWith("/folder/")
        || location.pathname.match(/^\/fm(?:\/(?:[0-9A-Za-z]{8})?)?$/)) {
        mode = "folder";
    } else if (location.pathname.startsWith("/fm/chat/contacts")) {
        mode = "fm-contacts";
    } else if (location.pathname.startsWith("/fm/chat")) {
        mode = "fm-chat";
    } else if (location.pathname.startsWith("/fm/pwm")) {
        mode = "fm-pwm";
    } else if (location.pathname.startsWith("/fm/account")) {
        mode = "fm-account";
    } else if (location.pathname.startsWith("/fm/shares")
        || location.pathname.startsWith("/fm/out-shares")
        || location.pathname.startsWith("/fm/public-links")
        || location.pathname.startsWith("/fm/file-requests")) {
        mode = "fm-shares";
    } else if (location.pathname.startsWith("/fm/")) {
        mode = "fm";
    }
    if (mode !== prevMode || forceRefresh) {
        forceRefresh = false;
        observer?.disconnect();
        console.debug("[MEGA-PWD]", "SwitchMode:", prevMode, "->", mode);
        prevMode = mode;
        if (mode !== null) {
            /** @type {{callback:()=>void,selector:string}|null} */
            let config = null;
            switch (mode) {
                case "password":
                    config = {
                        selector: "#password-dialog-title",
                        callback: () => simpleCallback("#password-dialog-title")
                    };
                    break;
                case "file":
                    config = {
                        selector: ".title-block",
                        callback: () => simpleCallback(".title-block")
                    };
                    break;
                case "folder":
                    config = {
                        selector: ".fm-right-files-block .fm-breadcrumbs-wrapper",
                        callback: folderCallback
                    };
                    break;
                case "fm-contacts":
                    config = {
                        selector: ".contacts-navigation",
                        callback: () => simpleCallback(".contacts-navigation .active")
                    };
                    break;
                case "fm-chat":
                    config = {
                        selector: ".lhp-nav",
                        callback: () => simpleCallback(".lhp-nav-container.active")
                    };
                    break;
                case "fm-pwm":
                    config = {
                        selector: ".primary-text",
                        callback: () => simpleCallback(".primary-text")
                    };
                    break;
                case "fm-account":
                    config = {
                        selector: ".account .lp-header",
                        callback: () => simpleCallback(".account .settings-button.active .head-title")
                    };
                    break;
                case "fm-shares":
                    config = {
                        selector: ".shares-tabs-bl",
                        callback: () => simpleCallback(".shares-tab-lnk.active")
                    };
                    break;
                case "fm":
                    config = {
                        selector: ".menu.ps",
                        callback: () => simpleCallback(".mega-component.active .primary-text")
                    };
                    break;
            }
            observer = new MutationObserver(config.callback);
            if (mode === "file" || mode === "folder") {
                while (!(element = document.querySelector(".dlkey-dialog"))) {
                    await sleep(50);
                }
                config.callback();
                observer.observe(element, OBSERVER_CONFIG);
                if (mode === "file") {
                    const largeChangeObserver = new MutationObserver(records => {
                        if (records.find(
                            it => Array.from(it.removedNodes).find(
                                iit => iit instanceof Element && iit.classList.contains("bottom-page")))) {
                            largeChangeObserver.disconnect();
                            forceRefresh = true;
                        }
                    });
                    largeChangeObserver.observe(document.querySelector("#startholder"), OBSERVER_CONFIG);
                }
            }
            while (!(element = document.querySelector(config.selector))) {
                await sleep(50);
            }
            config.callback();
            observer.observe(document.querySelector("title"), OBSERVER_CONFIG);
            observer.observe(element, OBSERVER_CONFIG);
        }
    }
    setTimeout(main, 100);
}