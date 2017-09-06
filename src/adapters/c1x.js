var CONSTANTS = require('../constants.json');
var utils = require('../utils.js');
var bidfactory = require('../bidfactory.js');
var bidmanager = require('../bidmanager.js');
var adloader = require('../adloader');
/**
 * Adapter for requesting bids from C1X header tag server.
 * v0.3 (c) C1X Inc., 2016
 *
 * @param {Object} options - Configuration options for C1X
 *
 * @returns {{callBids: _callBids}}
 * @constructor
 */
var C1XAdapter = function C1XAdapter() {
  // default endpoint. Can be overridden by adding an "endpoint" property to the first param in bidder config.
  var ENDPOINT = 'https://ht.c1exchange.com/ht',
    PIXEL_ENDPOINT = '//px.c1exchange.com/pubpixel/',
    PIXEL_FIRE_DELAY = 3000;
  
  // inject the audience pixel only if pixelId is set.
  function injectAudiencePixel(pixelId) {    
    if (pixelId) {
      window.setTimeout(function() {
        var pixel = document.createElement('img');
        pixel.width = 1;
        pixel.height = 1;
        pixel.style='display:none;';
        var useSSL = document.location.protocol == 'https:';
        pixel.src = (useSSL ? 'https:' : 'http:') +
        PIXEL_ENDPOINT + pixelId;
        document.body.insertBefore(pixel, null);
      }, PIXEL_FIRE_DELAY);
    }
  }

  function _callBids(params) {
    // serialize all the arguments and send it to C1X header bidder.
    // example: ?site=goodsite.com&adunits=2&a1=gpt-34-banner1&a1s=[300x250]&a2=gpt-36-right-center&a2s=[300x200,300x600]
    
    var bids = params.bids,
      options = ['adunits=' + bids.length],
      siteId = null,
      dspId = null,
      pixelId = null,
      c1xEndpoint = ENDPOINT;
    
    for (var i = 0; i < bids.length; i++) {
      var bid = bids[i];
      
      if (!bid.params.siteId) {
        utils.logError('c1x: error - no site id supplied!');
        continue;
      }

      // siteid should be set only once in request
      if (siteId == null) {
        siteId = bid.params.siteId;
        options.push('site=' + siteId);
      }

      // dspid should be set only once in request
      if (dspId == null && bid.params.dspid) {        
        dspId = bid.params.dspid;
      }

      // only one pixel should be executed
      if(pixelId == null && bid.params.pixelId){
        pixelId = bid.params.pixelId;
        injectAudiencePixel(pixelId);
      }

      // use default endpoint if not provided dynamically
      if (bid.params.endpoint) {
        c1xEndpoint = bid.params.endpoint;
      }
      
      options.push('a' + (i + 1) + '=' + bid.placementCode);
      var sizes = bid.sizes,
        sizeStr = sizes.reduce(function(prev, current) { return prev + (prev === '' ? '' : ',') + current.join('x') }, '');
      
      // send floor price if the setting is available.
      var floorPriceMap = bid.params.floorPriceMap;
      utils.logInfo('floor price map: ', floorPriceMap);
      utils.logInfo('size: ' + sizes[0]);
      if (floorPriceMap) {
        // are we sure that we should not check for other sizes ?
        var adUnitSize = sizes[0].join('x');
        if (adUnitSize in floorPriceMap) {
          options.push('a' + (i + 1) + 'p=' + floorPriceMap[adUnitSize]);
        }
      }
      options.push('a' + (i + 1) + 's=[' + sizeStr + ']');
    }

    // no need to call server if there are no bids to request
    if (options.length == 1) {
      utils.logError('c1x: error - no site id supplied for any bid!');
      return;
    }
    
    options.push('rnd=' + new Date().getTime());
    options.push('cbmn=_inuxuAdzebraResponse');
    // cache busting

    if (dspId) {
      options.push('dspid=' + dspId);
    }
    var url = c1xEndpoint + '?' + options.join('&');
    window._inuxuAdzebraResponse = function(response) {
      for (var i = 0; i < response.length; i++) {
        var data = response[i],
          bidObject = null;
        if (data.bid) {
          bidObject = bidfactory.createBid(CONSTANTS.STATUS.GOOD);
          bidObject.bidderCode = 'c1x';
          bidObject.cpm = data.cpm;
          bidObject.ad = data.ad;
          bidObject.width = data.width;
          bidObject.height = data.height;
          console.log('c1x: INFO creating bid for adunit: ' + data.adId + ' size: ' + data.width + 'x' + data.height);
        } else {
          // no bid.
          bidObject = bidfactory.createBid(CONSTANTS.STATUS.NO_BID);
          bidObject.bidderCode = 'c1x';
          console.log('c1x: INFO creating a NO bid for adunit: ' + data.adId);
        }
        bidmanager.addBidResponse(data.adId, bidObject);
      }
    }
    adloader.loadScript(url);
  }
  // Export the callBids function, so that prebid.js can execute this function
  // when the page asks to send out bid requests.
  return {
    callBids: _callBids
  };
};
module.exports = C1XAdapter;
