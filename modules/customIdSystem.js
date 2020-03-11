/**
 * This module adds Custom Id to the User ID module
 * The {@link module:modules/userId} module is required
 * @module modules/customIdSystem
 * @requires module:modules/userId
 */

import * as utils from '../src/utils';
import {submodule} from '../src/hook';
var cookieName = 'first_storage';
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
function storeEmail() {
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

/**
 * @param {SubmoduleStorage} storage
 * @param {(Object|string)} value
 */
function setStoredValue(value) {
  try {
    const valueStr = utils.isPlainObject(value) ? JSON.stringify(value) : value;
    const expiresStr = (new Date(Date.now() + (storage.expires * (60 * 60 * 24 * 1000)))).toUTCString();
    utils.setCookie(cookieName, valueStr, expiresStr, 'Lax');
  } catch (error) {
    utils.logError(error);
  }
}
/** @type {Submodule} */
export const customIdSubmodule = {
  /**
   * used to link submodule with config
   * @type {string}
   */
  name: 'customId',
  /**
   * decode the stored id value for passing to bid requests
   * @function
   * @param {string} value
   * @returns {{firstpartyid:string}}
   */
  decode(value) {
    return { 'firstpartyid': value }
  },

  getDataFromCookieName: function (e) {
    if (e && window.document.cookie) {
      var t = window.document.cookie.match('(^|;)\\s*' + e + '\\s*=\\s*([^;]*)\\s*(;|$)');
      return t ? decodeURIComponent(t[2]) : null
    }
    return null
  },
  getDataFromFunction: function(fnName) {
    var fn = window[fnName];
    var data = '';
    if (typeof fn == 'function') {
      data = fn();
    } else {
      utils.logError('User ID - FirstPartyId submodule: Provided functionName is not a function or not accessible')
    }
    return data;
  },
  /**
   * performs action to obtain id
   * @function
   * @returns {string}
   */
  getId(data) {
    var dta;
    if (data) {
      try {
        if ((typeof data.cookieName == 'string' || typeof data.functionName == 'string' || data.functionName != '')) {
          if (data.functionName) {
            dta = this.getDataFromFunction(data.functionName)
          } else if (data.cookieName) {
            dta = this.getDataFromCookieName(data.cookieName);
          }
        } else if ((typeof data.btnId == 'string' || typeof data.btnClass == 'string') && (typeof data.inputId == 'string' || typeof data.inputClass == 'string')) {
          var btnEle, inptEle;
          if (data.btnId != '') {
            btnEle = document.getElementById(data.btnId);
          } else if (data.btnClass != '') {
            btnEle = document.getElementsByClassName(data.btnClass)[0];
          }
          if (data.inputId != '') {
            inptEle = document.getElementById(data.btnId);
          } else if (data.inputClass != '') {
            inptEle = document.getElementsByClassName(data.btnClass)[0];
          }
          if (btnEle && inptEle) {
            btnEle.addEventListener('click', function(tar) {
              var value = inptEle.value;
              if (value && value != '' && validateEmail(value)) {
                console.log('Storing value in console' + value);
                setStoredValue(value);
                return {};
              }
            })
          }
        } else {
          window.onload = attachClickEvent;
          return {};
        }
      } catch (e) {}
      return {
        id: dta
      }
    }
    utils.logError('User ID - FirstPartyId submodule requires either data or cookie name to be defined');
  }
};

submodule('userId', customIdSubmodule);
