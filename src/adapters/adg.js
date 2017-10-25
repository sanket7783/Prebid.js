import * as Adapter from './adapter.js';
import bidfactory from '../bidfactory';
import bidmanager from '../bidmanager';
import * as utils from '../utils';
import {ajax} from '../ajax';
import {STATUS} from '../constants';

const ADG_BIDDER_CODE = 'adg';

var AdgAdapter = function AdgAdapter() {

  function _callBids(bidderRequest) {
    var bids = bidderRequest.bids || [];
    bids.forEach(bid => {
      try {
        ajax(buildOptimizedCall(bid), bidCallback, undefined, {withCredentials: true});
      } catch (err) {
        utils.logError(`XHR error, placement code is ${bid.placementCode} in adg`, null, err);
        addErrorBid();
      }

      function bidCallback(responseText) {
        try {
          utils.logMessage(`XHR callback function called for ad ID: ${bid.bidId}`);
          bidmanager.addBidResponse(bid.placementCode,generateBitResponse(responseText,bid));
        } catch (err) {
          if (typeof err === 'string') {
            utils.logWarn(`XHR response error, ${err} placement code  is ${bid.placementCode} in adg`);
          } else {
            utils.logError(`XHR response error, placement code is ${bid.placementCode} in adg`, null, err);
          }
          addErrorBid();
        }
      }

      function addErrorBid() {
        let badBid = bidfactory.createBid(STATUS.NO_BID, bid);
        badBid.bidderCode = bid.bidder;
        bidmanager.addBidResponse(bid.placementCode, badBid);
      }
    });
  }

  //for ADG
  function buildOptimizedCall(bid) {
    bid.startTime = new Date().getTime();
    var id = utils.getBidIdParameter('id', bid.params);
    let url = bid.params.debug ? 'http://api-test.scaleout.jp/adsv/v1?' : 'https://d.socdm.com/adsv/v1?';
    url = utils.tryAppendQueryString(url, 'posall', 'SSPLOC');
    url = utils.tryAppendQueryString(url, 'id', id);
    url = utils.tryAppendQueryString(url, 'sdktype', '0');
    url = utils.tryAppendQueryString(url, 'hb', 'true');
    url = utils.tryAppendQueryString(url, 't', 'json3');
    if (bid.params.labels){
      let labels = bid.params.labels;
      for (let key in labels){
        url = utils.tryAppendQueryString(url, key, labels[key]);
      }
    }

    //remove the trailing "&"
    if (url.lastIndexOf('&') === url.length - 1) {
      url = url.substring(0, url.length - 1);
    }
    return url;
  }

  function generateBitResponse(responseText, bidRequest) {
    let res = JSON.parse(responseText);
    if (typeof res !== 'object') {
      throw 'bad response';
    }
    return res.results.length > 0 ? createBid(bidRequest, res) : invalidBidResponse(bidRequest);

    function createBid(bidRequest, res) {
      let bid = bidfactory.createBid(STATUS.GOOD, bidRequest);
      bid.bidderCode = bidRequest.bidder;
      bid.cpm = res.cpm || 0;
      bid.dealId = res.dealid || {};

      let ad = `<!-- adgen -->${res.ad}`;
      ad = insertBeforeBody(ad, res.beacon);
      if (res.vastxml && res.vastxml.length > 0) {
        ad = `<div id="apvad-${bidRequest.placementCode}"></div>` +
          insertBeforeBody(ad, createAPVTag() + insertVASTMethod(bidRequest.placementCode, res.vastxml));
      }
      bid.ad = ad;
      [bid.width, bid.height] = [bidRequest.params.width, bidRequest.params.height];

      return bid;
    }

    function createAPVTag() {
      const APVURL = 'https://cdn.apvdr.com/js/VideoAd.min.js';
      let apvScript = document.createElement('script');
      apvScript.type = 'text/javascript';
      apvScript.id = 'apv';
      apvScript.src = APVURL;
      return apvScript.outerHTML;
    }

    function insertVASTMethod(targetId, vastXml) {
      let apvVideoAdParam = {
        s: targetId
      };
      let script = document.createElement(`script`);
      script.type = 'text/javascript';
      script.innerHTML = `(function(){ new APV.VideoAd(${JSON.stringify(apvVideoAdParam)}).load('${vastXml.replace(/\r?\n/g, "")}'); })();`;
      return script.outerHTML;
    }

    function insertBeforeBody(ad, data) {
      return ad.replace(/<\/\s?body>/, data +'</body>');
    }

    function invalidBidResponse(bidRequest) {
      let bid = bidfactory.createBid(2, bidRequest);
      bid.bidderCode = bidRequest.bidder;
    }
  }

  return Object.assign(Adapter.createNew(ADG_BIDDER_CODE), {
    callBids: _callBids,
    createNew: AdgAdapter.createNew
  });
};

AdgAdapter.createNew = function () {
  return new AdgAdapter();
};
module.exports = AdgAdapter;
