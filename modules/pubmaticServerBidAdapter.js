import * as utils from 'src/utils';
import { registerBidder } from 'src/adapters/bidderFactory';
const constants = require('src/constants.json');

const BIDDER_CODE = 'pubmaticServer';
//const ENDPOINT = '//hb.pubmatic.com/openrtb/241/?';
const ENDPOINT = '//172.16.4.65:8001/openrtb/241/?';
const USYNCURL = '//ads.pubmatic.com/AdServer/js/showad.js#PIX&kdntuid=1&p=';
const CURRENCY = 'USD';
const AUCTION_TYPE = 2;
const UNDEFINED = undefined;
//todo: is it required ?
const CUSTOM_PARAMS = {
  'kadpageurl': '', // Custom page url
  'gender': '', // User gender
  'yob': '', // User year of birth
  'lat': '', // User location - Latitude
  'lon': '', // User Location - Longitude
  'wiid': '', // OpenWrap Wrapper Impression ID
  'profId': '', // OpenWrap Legacy: Profile ID
  'verId': '' // OpenWrap Legacy: version ID
};

let publisherId = 0;

function _getDomainFromURL(url) {
  let anchor = document.createElement('a');
  anchor.href = url;
  return anchor.hostname;
}

function _parseSlotParam(paramName, paramValue) {
  if (!utils.isStr(paramValue)) {
    paramValue && utils.logWarn('PubMaticServer: Ignoring param key: ' + paramName + ', expects string-value, found ' + typeof paramValue);
    return UNDEFINED;
  }

  paramValue = paramValue.trim();

  switch (paramName) {
    case 'pmzoneid':
      return paramValue.split(',').slice(0, 50).join();
    case 'kadfloor':
      return parseFloat(paramValue) || UNDEFINED;
    case 'lat':
      return parseFloat(paramValue) || UNDEFINED;
    case 'lon':
      return parseFloat(paramValue) || UNDEFINED;
    case 'yob':
      return parseInt(paramValue) || UNDEFINED;
    case 'gender':    
    default:
      return paramValue;
  }
}

//todo: remove code ??
function _cleanSlot(slotName) {
  if (utils.isStr(slotName)) {
    return slotName.replace(/^\s+/g, '').replace(/\s+$/g, '');
  }
  return '';
}

//todo: is it required ?
function _parseAdSlot(bid) {
  bid.params.adUnit = '';
  bid.params.adUnitIndex = '0';
  bid.params.width = 0;
  bid.params.height = 0;

  bid.params.adSlot = _cleanSlot(bid.params.adSlot);

  var slot = bid.params.adSlot;
  var splits = slot.split(':');

  slot = splits[0];
  if (splits.length == 2) {
    bid.params.adUnitIndex = splits[1];
  }
  splits = slot.split('@');
  if (splits.length != 2) {
    utils.logWarn('AdSlot Error: adSlot not in required format');
    return;
  }
  bid.params.adUnit = splits[0];
  splits = splits[1].split('x');
  if (splits.length != 2) {
    utils.logWarn('AdSlot Error: adSlot not in required format');
    return;
  }
  bid.params.width = parseInt(splits[0]);
  bid.params.height = parseInt(splits[1]);
}

function _initConf() {
  var conf = {};
  conf.pageURL = utils.getTopWindowUrl();
  conf.refURL = utils.getTopWindowReferrer();
  return conf;
}

//todo: remove code ?? is it required ??
function _handleCustomParams(params, conf) {
  // istanbul ignore else
  if (!conf.kadpageurl) {
    conf.kadpageurl = conf.pageURL;
  }

  var key, value, entry;
  for (key in CUSTOM_PARAMS) {
    // istanbul ignore else
    if (CUSTOM_PARAMS.hasOwnProperty(key)) {
      value = params[key];
      // istanbul ignore else
      if (value) {
        entry = CUSTOM_PARAMS[key];

        if (typeof entry === 'object') {
          // will be used in future when we want to process a custom param before using
          // 'keyname': {f: function() {}}
          value = entry.f(value, conf);
        }

        if (utils.isStr(value)) {
          conf[key] = value;
        } else {
          utils.logWarn('PubMatic: Ignoring param : ' + key + ' with value : ' + CUSTOM_PARAMS[key] + ', expects string-value, found ' + typeof value);
        }
      }
    }
  }
  return conf;
}

function _createOrtbTemplate(conf) {
  return {
    id: '' + new Date().getTime(),
    at: AUCTION_TYPE,
    cur: [CURRENCY],
    imp: [],
    site: {
      page: conf.pageURL,
      ref: conf.refURL,
      publisher: {}
    },
    device: {
      ua: navigator.userAgent,
      js: 1,
      dnt: (navigator.doNotTrack == 'yes' || navigator.doNotTrack == '1' || navigator.msDoNotTrack == '1') ? 1 : 0,
      h: screen.height,
      w: screen.width,
      language: navigator.language
    },
    user: {},
    ext: {}
  };
}

function _createImpressionObject(bid, conf) {
  return {
    id: bid.bidId,
    tagid: bid.params.divId,
    bidfloor: _parseSlotParam('kadfloor', bid.params.kadfloor),
    secure: window.location.protocol === 'https:' ? 1 : 0,
    banner: {
      pos: 0,
      topframe: utils.inIframe() ? 0 : 1,
      format: (function(){
        var arr = [];
        for(let i = 0, l = bid.sizes.length; i<l; i++){
          arr.push({
            w: bid.sizes[i][0], 
            h: bid.sizes[i][1]
          });          
        }
        return arr;
      })()
    },    
    ext: {
      pmZoneId: _parseSlotParam('pmzoneid', bid.params.pmzoneid),
      div: bid.params.divId,
      adunit: bid.params.adUnitId,
      slotIndex: bid.params.adUnitIndex
    }
  };
}

export const spec = {
  code: BIDDER_CODE,

  /**
  * Determines whether or not the given bid request is valid. Valid bid request must have placementId and hbid
  *
  * @param {BidRequest} bid The bid params to validate.
  * @return boolean True if this is a valid bid, and false otherwise.
  */
  isBidRequestValid: bid => {
    //todo: can we improve the logwarn message from dupicating ?
    if (bid && bid.params) {
      if (!utils.isStr(bid.params.publisherId)) {
        utils.logWarn('PubMaticServer: publisherId is mandatory and it should be a string.');
        return false;
      }
      if (!utils.isStr(bid.params.adUnitId)) {
        utils.logWarn('PubMaticServer: adUnitId is mandatory and it should be a string.');
        return false;
      }
      if (!utils.isStr(bid.params.divId)) {
        utils.logWarn('PubMaticServer: divId is mandatory and it should be a string.');
        return false;
      }
      if (!utils.isStr(bid.params.adUnitIndex)) {
        utils.logWarn('PubMaticServer: adUnitIndex is mandatory and it should be a string.');
        return false;
      }
      return true;
    }
    return false;
  },

  /**
  * Make a server request from the list of BidRequests.
  *
  * @param {validBidRequests[]} - an array of bids
  * @return ServerRequest Info describing the request to the server.
  */
  buildRequests: validBidRequests => {
    var conf = _initConf();
    var payload = _createOrtbTemplate(conf);
    validBidRequests.forEach(bid => {
      //_parseAdSlot(bid); //todo: remove code
      //if(! (bid.params.adSlot && bid.params.adUnitId && utils.isNumber(bid.params.adUnitIndex))){
      //  utils.logWarn('PubMaticServer: Skipping the non-standard adslot:', bid.params.adSlot, bid);
      //  return;
      //}
      conf.pubId = conf.pubId || bid.params.publisherId;
      conf = _handleCustomParams(bid.params, conf);//todo is it required ?
      conf.transactionId = bid.transactionId;
      payload.imp.push(_createImpressionObject(bid, conf));
    });

    if (payload.imp.length == 0) {
      return;
    }

    payload.site.publisher.id = conf.pubId.trim();
    publisherId = conf.pubId;
    payload.ext.dm = {
      rs: 1,      
      pubId: conf.pubId,      
      wp: 'pbjs',
      wv: constants.REPO_AND_VERSION,
      transactionId: conf.transactionId,
      profileid: conf.profId || UNDEFINED,
      versionid: conf.verId || "1",
      wiid: conf.wiid || UNDEFINED
    };
    /*
    payload.ext.as = {
        "SAVersion": "1000",
        "kltstamp": "2016-8-18 12:37:28",
        "timezone": 5.5,
        "screenResolution": "1366x768",
        "ranreq": 0.35227230576370405,
        "pageURL": "2kmtcentral.com",
        "refurl": "",
        "inIframe": "0",
        "kadpageurl": "2kmtcentral.com"
    };
    */
    payload.user.gender = _parseSlotParam('gender', conf.gender);
    payload.user.yob = _parseSlotParam('yob', conf.yob);
    payload.user.geo = {};
    payload.user.geo.lat = _parseSlotParam('lat', conf.lat);
    payload.user.geo.lon = _parseSlotParam('lon', conf.lon);
    payload.device.geo = payload.user.geo;
    payload.site.page = conf.kadpageurl || payload.site.page;
    payload.site.domain = _getDomainFromURL(payload.site.page);
    return {
      method: 'POST',
      url: ENDPOINT,
      data: JSON.stringify(payload)
    };
  },

  /**
  * Unpack the response from the server into a list of bids.
  *
  * @param {*} response A successful response from the server.
  * @return {Bid[]} An array of bids which were nested inside the server.
  */
  interpretResponse: (response, request) => {
    const bidResponses = [];
    try {
      if (response.body && response.body.seatbid && response.body.seatbid[0] && response.body.seatbid[0].bid) {
        response.body.seatbid[0].bid.forEach(bid => {

          if(bid.id !== null && bid.ext.summary){
            bid.ext.summary.forEach((summary, index) => {
              // index handling: 0th summary is actually summary of winning bid, 
              // other summaries are loosing bids
              if(summary.bidder){
                let firstSummary = index === 0;
                let newBid = {
                  requestId: bid.impid,
                  bidderCode: BIDDER_CODE,
                  originalBidder: summary.bidder,
                  cpm: (parseFloat(summary.bid) || 0).toFixed(2),
                  width: summary.width, //todo can we change this to w ?
                  height: summary.height, //todo can we change this to h ?
                  creativeId: firstSummary ? (bid.crid || bid.id) : bid.id,
                  dealId: firstSummary ? (bid.dealid || UNDEFINED) : UNDEFINED,
                  currency: CURRENCY,
                  netRevenue: true,
                  ttl: 300,
                  referrer: utils.getTopWindowUrl(),
                  ad: firstSummary ? bid.adm : ''
                };
                bidResponses.push(newBid);
              }
            });
          }
        });
      }
    } catch (error) {
      utils.logError(error);
    }
    return bidResponses;
  },

  /**
  * Register User Sync.
  */
  getUserSyncs: (syncOptions, serverResponses) => {
    let serverResponse;
    let urls = [];
    if(serverResponses.length > 0){
      serverResponse = serverResponses[0];
    }

    if(serverResponse.ext && serverResponse.ext.extension && utils.isArray(serverResponse.ext.extension) ){
      serverResponse.ext.extension.forEach(partner => {
        if(!partner.error && partner.usersync && partner.usersync.url){
          if(partner.usersync.type === 'iframe'){//todo: move 'iframe' to const
            if (syncOptions.iframeEnabled) {
              urls.push({
                type: 'iframe',
                url: partner.usersync.url
              });
            }else{
              utils.logWarn('PubMaticServer: Please enable iframe based user sync.');
            }
          }
          //todo: handle other types as well
        }
      });
    }

    if (syncOptions.iframeEnabled) {
      return [{
        type: 'iframe',
        url: USYNCURL + publisherId
      }];
    }else{
      utils.logWarn('PubMaticServer: Please enable iframe based user sync.');
    }
  }
};

registerBidder(spec);