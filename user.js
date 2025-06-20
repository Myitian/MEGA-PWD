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
    const title = document.querySelector("title").innerText.trim();
    if (baseTitle === null || /^[^\|]+MEGA[^\|]+$/.test(title)) {
        baseTitle = title;
    }
    /** @type {HTMLElement} */
    const element = document.querySelector(selector);
    mName = element?.innerText.replace("\n", "");
    const newTitle = `${mName} | ${baseTitle}`.trim();
    if (title !== newTitle) {
        document.title = newTitle;
    }
}
function folderCallback() {
    const title = document.querySelector("title").innerText.trim();
    if (baseTitle === null || /^[^\|]+MEGA[^\|]+$/.test(title)) {
        baseTitle = title;
    }
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
    const newTitle = `${mName} | ${baseTitle}`.trim();
    if (title !== newTitle) {
        document.title = newTitle;
    }
};
/** @param {number} t */
function sleep(t) {
    return new Promise((rs, _) => setTimeout(rs, t));
}

/** @typedef {"password"|"file"|"folder"|"fm"|"fm-chat"|"fm-contacts"|"fm-pwm"|null} Mode */

const OBSERVER_CONFIG = { attributes: true, childList: true, subtree: true };
GM_registerMenuCommand("PWD", () => prompt("Value", mName));
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
    } else if (location.pathname.startsWith("/fm/")) {
        mode = "fm";
    }
    if (mode !== prevMode) {
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
                        callback: simpleCallback.bind(null, "#password-dialog-title")
                    }
                    break;
                case "file":
                    config = {
                        selector: ".title-block",
                        callback: simpleCallback.bind(null, ".title-block")
                    }
                    break;
                case "folder":
                    config = {
                        selector: ".fm-right-files-block .fm-breadcrumbs-wrapper",
                        callback: folderCallback
                    }
                    break;
                case "fm-contacts":
                    config = {
                        selector: ".contacts-navigation",
                        callback: simpleCallback.bind(null, ".contacts-navigation .active")
                    }
                    break;
                case "fm-chat":
                    config = {
                        selector: ".lhp-nav",
                        callback: simpleCallback.bind(null, ".lhp-nav-container.active")
                    }
                    break;
                case "fm-pwm":
                    config = {
                        selector: ".primary-text",
                        callback: simpleCallback.bind(null, ".primary-text")
                    }
                    break;
                case "fm":
                    config = {
                        selector: ".menu.ps",
                        callback: simpleCallback.bind(null, ".mega-component.active")
                    }
                    break;
            }
            while (!(element = document.querySelector(config.selector))) {
                await sleep(10);
            }
            config.callback();
            observer = new MutationObserver(config.callback);
            observer.observe(document.querySelector("title"), OBSERVER_CONFIG);
            observer.observe(element, OBSERVER_CONFIG);
        }
    }
    setTimeout(main, 100);
}