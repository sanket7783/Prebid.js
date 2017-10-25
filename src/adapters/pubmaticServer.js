var utils = require('../utils.js');
var bidfactory = require('../bidfactory.js');
var bidmanager = require('../bidmanager.js');
const constants = require('../constants.json');

/**
 * Adapter for requesting bids from Pubmatic.
 *
 * @returns {{callBids: _callBids}}
 * @constructor
 */
var PubmaticServerAdapter = function PubmaticServerAdapter() {
  var bids;
  var usersync = false;
  var _secure = 0;
  let _protocol = (window.location.protocol === 'https:' ? (_secure = 1, 'https') : 'http') + '://';
  let iframe;

  var dealChannelValues = {
    1: 'PMP',
    5: 'PREF',
    6: 'PMPG'
  };

  var customPars = {
    'kadgender': 'gender',
    'age': 'kadage',
    'dctr': 'dctr', // Custom Targeting
    'wiid': 'wiid', // Wrapper Impression ID
    'profId': 'profId', // Legacy: Profile ID
    'verId': 'verId', // Legacy: version ID
    'pmzoneid': { // Zone ID
      n: 'pmZoneId',
      m: function(zoneId) {
        if (utils.isStr(zoneId)) {
          return zoneId.split(',').slice(0, 50).join();
        } else {
          return '';
        }
      }
    }
  };

  function _initConf() {
    var conf = {},
      currTime = new Date();

    conf.SAVersion = '1100';
    conf.wp = 'PreBid';
    conf.js = 1;
    conf.wv = constants.REPO_AND_VERSION;
    _secure && (conf.sec = 1);
    conf.screenResolution = screen.width + 'x' + screen.height;
    conf.ranreq = Math.random();
    conf.inIframe = window != top ? '1' : '0';

    // istanbul ignore else
    if (window.navigator.cookieEnabled === false) {
      conf.fpcd = '1';
    }

    try {
      conf.pageURL = window.top.location.href;
      conf.refurl = window.top.document.referrer;
    } catch (e) {
      conf.pageURL = window.location.href;
      conf.refurl = window.document.referrer;
    }

    conf.kltstamp = currTime.getFullYear() +
      '-' + (currTime.getMonth() + 1) +
      '-' + currTime.getDate() +
      ' ' + currTime.getHours() +
      ':' + currTime.getMinutes() +
      ':' + currTime.getSeconds();
    conf.timezone = currTime.getTimezoneOffset() / 60 * -1;

    return conf;
  }

  function _handleCustomParams(params, conf) {
    // istanbul ignore else
    if (!conf.kadpageurl) {
      conf.kadpageurl = conf.pageURL;
    }

    var key, value, entry;
    for (key in customPars) {
      // istanbul ignore else
      if (customPars.hasOwnProperty(key)) {
        value = params[key];
        // istanbul ignore else
        if (value) {
          entry = customPars[key];

          if (typeof entry === 'object') {
            value = entry.m(value, conf);
            key = entry.n;
          } else {
            if (utils.isStr(value)) {
              key = customPars[key];
            } else {
              utils.logWarn('PubMatic: Ignoring param key: ' + customPars[key] + ', expects string-value, found ' + typeof value);
            }
          }

          // istanbul ignore else
          if (value) {
            conf[key] = value;
          }
        }
      }
    }
    return conf;
  }

  function _cleanSlots(slots) {
    var i,
      len = slots.length,
      tempSlot,
      tempSlots = [];

    for (i = 0; i < len; i++) {
      tempSlot = slots[i];
      // istanbul ignore else
      if (utils.isStr(tempSlot)) {
        tempSlot = tempSlot.replace(/^\s+/g, '').replace(/\s+$/g, '');
        // istanbul ignore else
        if (tempSlot.length > 0) {
          tempSlots.push(tempSlot);
        }
      }
    }

    return tempSlots;
  }

  function _legacyExecution(conf, slots) {
    var url = _generateLegacyCall(conf, slots);
    iframe = utils.createInvisibleIframe();
    var elToAppend = document.getElementsByTagName('head')[0];
    elToAppend.insertBefore(iframe, elToAppend.firstChild);
    var iframeDoc = utils.getIframeDocument(iframe);
    var content = utils.createContentToExecuteExtScriptInFriendlyFrame(url);
    content = content.replace(`<!--POST_SCRIPT_TAG_MACRO-->`, `<script>window.parent.`+preBidNameSpace+`.handlePubmaticCallback(window.bidDetailsMap, window.progKeyValueMap);</script>`);
    iframeDoc.write(content);
    iframeDoc.close();
  }

  function _generateLegacyCall(conf, slots) {
    var request_url = 'gads.pubmatic.com/AdServer/AdCallAggregator';
    return _protocol + request_url + '?' + utils.parseQueryStringParameters(conf) + 'adslots=' + encodeURIComponent('[' + slots.join(',') + ']');
  }

  function _initUserSync(pubId) {
    // istanbul ignore else
    if (!usersync) {
      var iframe = utils.createInvisibleIframe();
      iframe.src = _protocol + 'ads.pubmatic.com/AdServer/js/showad.js#PIX&kdntuid=1&p=' + pubId;
      utils.insertElement(iframe, document);
      usersync = true;
    }
  }

  function copyFromConfAndDeleteFromConf(conf, key, dmExtension){
    if(conf[key]){
      dmExtension[key] = decodeURIComponent(conf[key]);
      delete conf[key];
    }
  }

  function convertAllValuesToString(obj){
    var newObj = {};
    for(var key in obj){
      if(obj.hasOwnProperty(key)){
        newObj[key] = String(obj[key]);
      }
    }
    return newObj;
  }

  function createOrtbJson(conf, slots){
      var json = {},
        passTheseConfParamsIntoDmExtension = ['a', 'pm_cb', 'pubId', 'ctype', 'kval_param', 'lmk'],
        kval_param_slot = {}
      ;

      if(slots.length == 0){
        return null;
      }

      // todo: do we need this block; I think we should pass kvp for each slot separately
      if(conf.kval_param_slot){
        try{
          kval_param_slot = JSON.parse(decodeURIC(conf.kval_param_slot));
        }catch(e){}
        delete conf.kval_param_slot;
      }      

      // setting up the schema
      json = {
        id : '' + new Date().getTime(), //todo is it ok ?
        at: 2, // todo : change to what ?
        cur: ["USD"],
        imp: [],
        site: {
          domain: location.hostname,
          page: location.href,
          publisher: {
            id: ''
          }
        },
        device: {
          ua: navigator.userAgent
        },
        ext: {}
      };

      // adding slots info
      for(var i= 0, l = slots.length; i < l; i++){

        conf.pubId = conf.pubId || bid.params.publisherId;
        conf = _handleCustomParams(slot.params, conf);

        var slot = slots[i];
        var adUnitIndex = slot.params.adUnitIndex || 0;
        var adUnitId = slot.params.adUnitId || '';
        var divId = slot.params.divId || '';
        var sizes = slot.sizes;

        if(! adUnitId && divId && sizes.length > 0){          
          // log: mandatory params are missing
          continue;
        }        

        var anImp = {
          id: json.id + '_' + i, // todo: if divId is returned in response then ok else we need to use divId as id here
          tagid: adUnitId,
          secure: conf.sec,
          banner: {
            pos: 0,
            format: [], //todo: how to pass multiple sizes
          },
          ext: {
              div: divId,
              slotIndex: adUnitIndex,
              // todo: do we need this ? I think we should pass kvp for each slot separately
              //"keyValue": kval_param_slot.hasOwnProperty(slot) ? kval_param_slot[slot] : {}
          }
        };

        for(var sizeIndex=0, sizeIndexMax=sizes.length; sizeIndex<sizeIndexMax; sizeIndex++){
          anImp.bamner.format.push({w: sizes[sizeIndex][0], h: sizes[sizeIndex][1]});
        }

        json.imp.push(anImp);
      }

      //if there are no json.imp then return undefined
      if(json.imp.length == 0){
        return null;
      }

      // setting pub id
      json.site.publisher.id = '' + conf.pubId;

      // DM specific params
      var dmExtension = {
        rs: 2
      };      
      for(var i=0, l = passTheseConfParamsIntoDmExtension.length; i < l; i++){
        copyFromConfAndDeleteFromConf(conf, passTheseConfParamsIntoDmExtension[i], dmExtension);
      }     
      json.ext['dm'] = dmExtension;
      // AdServer specific params to be passed, as it is
      json.ext['as'] = convertAllValuesToString(conf);

      return json;
    }

  function _callBids(params) {
    var conf = _initConf(),
      slots = [];
    conf.pubId = 0;

    var request_url = _protocol + 'hb.pubmatic.com/openrtb/241/?', //todo is it correct ?
      async = conf.a,
      json = createOrtbJson(conf, params.bids || [])
    ;

    if(json === null){
      //todo: log the failure
      return;
    }

    console.log(json);
    request_url += 'json='+encodeURIComponent(JSON.stringify(json));
    console.log(request_url);

  /*
    for (var i = 0; i < bids.length; i++) {
      var bid = bids[i];
      conf.pubId = conf.pubId || bid.params.publisherId;
      conf = _handleCustomParams(bid.params, conf);
      slots.push(bid.params.adSlot);
    }
    slots = _cleanSlots(slots);

    // istanbul ignore else
    if (conf.pubId && slots.length > 0) {
      _legacyExecution(conf, slots);
    }
  */

    _initUserSync(conf.pubId);
  }

  //todo: what about response handling
  $$PREBID_GLOBAL$$.handlePubmaticCallback = function(bidDetailsMap, progKeyValueMap) {
    var i;
    var adUnit;
    var adUnitInfo;
    var bid;
    var bidResponseMap = bidDetailsMap;
    var bidInfoMap = progKeyValueMap;

    if (!bidResponseMap || !bidInfoMap) {
      return;
    }  

    for (i = 0; i < bids.length; i++) {
      var adResponse;
      bid = bids[i].params;
      adUnit = bidResponseMap[bid.adSlot] || {};
      // adUnitInfo example: bidstatus=0;bid=0.0000;bidid=39620189@320x50;wdeal=
      // if using DFP GPT, the params string comes in the format:
      // "bidstatus;1;bid;5.0000;bidid;hb_test@468x60;wdeal;"
      // the code below detects and handles this.
      // istanbul ignore else
      if (bidInfoMap[bid.adSlot] && bidInfoMap[bid.adSlot].indexOf('=') === -1) {
        bidInfoMap[bid.adSlot] = bidInfoMap[bid.adSlot].replace(/([a-z]+);(.[^;]*)/ig, '$1=$2');
      }

      adUnitInfo = (bidInfoMap[bid.adSlot] || '').split(';').reduce(function(result, pair) {
        var parts = pair.split('=');
        result[parts[0]] = parts[1];
        return result;
      }, {});

      if (adUnitInfo.bidstatus === '1') {
        adResponse = bidfactory.createBid(1);
        adResponse.bidderCode = 'pubmatic';
        adResponse.adSlot = bid.adSlot;
        adResponse.cpm = Number(adUnitInfo.bid);
        adResponse.ad = unescape(adUnit.creative_tag);
        adResponse.ad += utils.createTrackPixelIframeHtml(decodeURIComponent(adUnit.tracking_url));
        adResponse.width = adUnit.width;
        adResponse.height = adUnit.height;
        adResponse.dealId = adUnitInfo.wdeal;
        adResponse.dealChannel = dealChannelValues[adUnit.deal_channel] || null;

        bidmanager.addBidResponse(bids[i].placementCode, adResponse);
      } else {
        // Indicate an ad was not returned
        adResponse = bidfactory.createBid(2);
        adResponse.bidderCode = 'pubmatic';
        bidmanager.addBidResponse(bids[i].placementCode, adResponse);
      }
    }
  };

  return {
    callBids: _callBids
  };
};

module.exports = PubmaticServerAdapter;
