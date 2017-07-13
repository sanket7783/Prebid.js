// refer aol_spec.js | adfor_spec.js
import {expect} from 'chai';
import * as utils from 'src/utils';
import PubMaticAdapter from 'src/adapters/pubmatic';
import bidmanager from 'src/bidmanager';

let getDefaultBidRequest = () => {
  return {
    bidderCode: 'pubmatic',
    requestId: 'd3e07445-ab06-44c8-a9dd-5ef9af06d2a6',
    bidderRequestId: '7101db09af0db2',
    start: new Date().getTime(),
    bids: [{
      bidder: 'pubmatic',
      bidId: '84ab500420319d',
      bidderRequestId: '7101db09af0db2',
      requestId: 'd3e07445-ab06-44c8-a9dd-5ef9af06d2a6',
      placementCode: 'foo',
      params: {
        placement: 1234567,
        network: '9599.1'
      }
    }]
  };
};

describe('PubMaticAdapter', () => {
  let adapter;
	
  function createBidderRequest({bids, params} = {}) {
    var bidderRequest = getDefaultBidRequest();
    if (bids && Array.isArray(bids)) {
      bidderRequest.bids = bids;
    }
    if (params) {
      bidderRequest.bids.forEach(bid => bid.params = params);
    }
    return bidderRequest;
  }

  beforeEach(() => adapter = new PubMaticAdapter());

  describe('callBids()', () => {
    it('exists and is a function', () => {
      expect(adapter.callBids).to.exist.and.to.be.a('function');
    });

    describe('bid request', () => {

		beforeEach(() => {
			sinon.stub(utils, "createContentToExecuteExtScriptInFriendlyFrame");
		});

		afterEach(() => {
			utils.createContentToExecuteExtScriptInFriendlyFrame.restore();
		});

		it('requires parameters to be made', () => {
          adapter.callBids({});
          utils.createContentToExecuteExtScriptInFriendlyFrame.calledOnce.should.be.false;
        });

        it('for publisherId 9999 call is made to haso.pubmatic.com', () => {        	
          adapter.callBids(createBidderRequest({
            params: {
              publisherId: 9999,
              adSlot: "abcd@728x90"
            }
          }));
          //console.log("utils.createContentToExecuteExtScriptInFriendlyFrame.called ==> ", utils.createContentToExecuteExtScriptInFriendlyFrame.called);
          //console.log(utils.createContentToExecuteExtScriptInFriendlyFrame.getCall(0).args);
          var callURL = utils.createContentToExecuteExtScriptInFriendlyFrame.getCall(0).args[0];
          expect(callURL).to.contain("haso.pubmatic.com");
        });
    });

  });  

});  