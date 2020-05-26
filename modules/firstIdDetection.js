/**
 * This module adds First Id Detection module to prebid.js
 * @module modules/firstIdDetection
 */

import { config } from '../src/config.js';
import {module} from '../src/hook.js';
import adapterManager from '../src/adapterManager.js';
import * as utils from '../src/utils.js';
import { getCoreStorageManager } from '../src/storageManager.js';
import sha256 from 'crypto-js/sha256';
import aes from 'crypto-js/aes';
export const coreStorage = getCoreStorageManager('core');

var firstPartyIdConfig, moduleNameWhiteList;
var moduleTypeWhiteList = ['core', 'userId'];
let subModules = [];

export function attachFirstPartyIdProvide(submodule) {
  subModules.push(submodule);
}

function setStoredValue(value) {
  try {
    const valueStr = utils.isPlainObject(value) ? JSON.stringify(value) : value;
    const expiresStr = (new Date(Date.now() + (1 * (60 * 60 * 24 * 1000)))).toUTCString();
    coreStorage.setCookie('firstPartyId', valueStr, expiresStr, 'Lax');
  } catch (error) {
    utils.logError(error);
  }
}

function attachClickEvent() {
  // get all the elements with className 'btn'. It returns an array
  var btnList = document.getElementsByTagName('button');
  var inputList = document.querySelectorAll('input[type=button]');
  var inputList1 = document.querySelectorAll('input[type=submit]');
  // get the lenght of array defined above
  var listLength = btnList.length;
  var i = 0
  // run the for look for each element in the array
  for (;i < listLength; i++) {
    // attach the event listener
    btnList[i].addEventListener('click', storeEmail);
  }
  i = 0;
  for (;i < inputList.length; i++) {
    // attach the event listener
    inputList[i].addEventListener('click', storeEmail);
  }
  i = 0;
  for (;i < inputList1.length; i++) {
    // attach the event listener
    inputList1[i].addEventListener('click', storeEmail);
  }
}

function validateEmail(email) {
  console.time('Regex');
  var re = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
  console.timeEnd('Regex');
  return re.test(email);
}

/** ignore next */
function storeEmail() {
  /* eslint no-console: "off" */
  console.time('Start');
  var inputs = document.getElementsByTagName('input');
  console.timeEnd('Start');
  console.time('Matching');
  console.log('inputs ' + inputs.length);
  for (var i = 0; i < inputs.length; i++) {
    var input = inputs[0];
    var value = input.value;
    if (value && value != '' && validateEmail(value)) {
      console.log('Storing value in console' + value);
      setStoredValue(value);
    }
  }
  console.timeEnd('Matching');
};

function getDataFromFunction(fnName) {
  var fn = window[fnName];
  var data = '';
  if (typeof fn == 'function') {
    data = fn();
  } else {
    utils.logError('User ID - FirstPartyId submodule: Provided functionName is not a function or not accessible')
  }
  return data;
};

function storeId(config) {
  var dta;
  if (config && config.captureemail.length > 0) {
    try {
      for (var i = 0; i < config.captureemail.length; i++) {
        if (dta && utils.isStr(dta) && dta != '') {
          break;
        }
        var obj = config.captureemail[i];

        switch (obj.type) {
          case 'functionName':
            dta = getDataFromFunction(obj.value);
            break;

          case 'javascriptObject':
            var jObjectArray = obj.value.split('.');
            var obj1;

            for (var j = 0; j < jObjectArray.length; j++) {
              if (!obj1) {
                if (window[jObjectArray[j]]) {
                  obj1 = window[jObjectArray[j]];
                }
              } else {
                obj1 = obj1[jObjectArray[j]];
              }
            }

            if (obj1 && utils['isStr'](obj1)) {
              dta = obj1;
            }

            break;

          case 'storedValue':
            var spanEle;

            if (obj.value.spanId != '') {
              spanEle = document.getElementById(obj.value.spanId);
            } else if (obj.value.spanClass != '') {
              spanEle = document.getElementsByClassName(obj.value.spanClass)[0];
            }
            if (spanEle && spanEle.innerText && spanEle.innerText != '') {
              dta = spanEle.innerText;
            }
            break;

          case 'inputForm':
            var btnEle, inptEle;

            if (obj.value.btnId != '') {
              btnEle = document.getElementById(obj.value.btnId);
            } else if (obj.value.btnClass != '') {
              btnEle = document.getElementsByClassName(obj.value.btnClass)[0];
            }

            if (obj.value.inputId != '') {
              inptEle = document.getElementById(obj.value.inputId);
            } else if (obj.value.inputClass != '') {
              inptEle = document.getElementsByClassName(obj.value.inputClass)[0];
            }

            if (btnEle && inptEle) {
              btnEle.addEventListener('click', function (tar) {
                var value = inptEle.value;

                if (value && value != '' && validateEmail(value)) {
                  console.log('Storing value in console' + value);
                  setStoredValue(value);
                  return {};
                }
              });
            }

            break;

          case 'applygenericsolution':
            if (obj.value) {
              attachClickEvent();
              return {};
            }

            break;

          default:
            attachClickEvent();
            return {};
        }
      };
    } catch (e) {}
    setStoredValue(dta);
    return {
      id: dta
    };
  }
}

function getId() {
  return coreStorage.getCookie('firstPartyId') || '';
}

function assignWhitelist(config) {
  if (config && config.whiteListedModules && config.whiteListedModules.length > 0) {
    moduleNameWhiteList = config.whiteListedModules;
  }
  if (config && config.whiteListedModuleType && config.whiteListedModuleType.length > 0) {
    moduleTypeWhiteList = config.whiteListedModuleType
  }
}

export function makeBidRequestsHook(fn, bidderRequests) {
  if (getId() != '') {
    bidderRequests.forEach(bidderRequest => {
      bidderRequest.bids.forEach(bid => {
        let result = getId();
        if (result) {
          if (!bid.userId) {
            bid['userId'] = {};
          }
          bid['userId']['firstPartyId'] = result;
        }
      });
    });
  }
  fn(bidderRequests);
}

/**
 * Take Config as
 * {
    "name":"customId",
    "storage.type": "cookie",
    "storage.expires": "30",
    "storage.name": "first_storage",
    "params.captureemail":[
      {type:"functionName",value:"getCustomData"},
      {type:"javascriptObject",value:"myData.user.email"},
      {type:"storedValue",value:{
        "spanId":"mySpanId"
      }},
      {type:"inputForm",value:{
        btnId:"myBtnId",
        inputId:"myInputId"
      }},
      {type:"applygenericsolution",value:true},
    ],
    "params.whiteListedModules":["britepool"],
    "params.whiteListedModuleType":["bidder","userId"]
  }
 */
export function init(config) {
  setTimeout(function() {
    firstPartyIdConfig = config.getConfig('firstPartyId');
    if (firstPartyIdConfig) {
      storeId(firstPartyIdConfig);
      adapterManager.makeBidRequests.after(makeBidRequestsHook);
      assignWhitelist(firstPartyIdConfig);
    }
  })
};

export function getRawEmail(moduleType, bidderName) {
  if (moduleTypeWhiteList.includes(moduleType) && moduleNameWhiteList.includes(bidderName)) {
    return getId();
  } else {
    utils.logWarn('Module not allowed to get Raw Email.');
  }
};

export function getEmail(moduleType, bidderName, encryptionAlgo) {
  if (moduleTypeWhiteList.includes(moduleType) && moduleNameWhiteList.includes(bidderName)) {
    switch (encryptionAlgo) {
      case 'sha256':
        return sha256(getId());
      case 'base64':
        return window.atob(getId());
      case 'aes':
        return aes(getId());
      default:
        return sha256(getId());
    }
  } else {
    utils.logWarn('Module not allowed to get email.');
  }
}

window.$$PREBID_GLOBAL$$.getEmail = getEmail;
window.$$PREBID_GLOBAL$$.getRawEmail = getRawEmail;
init(config);
module('firstIdDetection', attachFirstPartyIdProvide);
