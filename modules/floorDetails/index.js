import * as events from '../../src/events.js';
import CONSTANTS from '../../src/constants.json';

const GPT_IMPRESSION_VIEWABLE_EVENT = "impressionViewable"
var frequencyCount = {
	pageView: 1,
	bidServed: 0,
	impressionServed: 0,
	perSlotFreqCnt: {},
	identityPartners: [],
	viewedSlotDetails: {},
	userAgent:{
		brands: navigator.userAgentData.brands,
		isMobile: navigator.userAgentData.mobile,
		platform: navigator.userAgentData.platform
	}
};
var pathName = window.location.pathname;

export let impressionViewableHandler = (globalModuleConfig, slot, event) => {
	//console.log('I am calling when viewed',slot.getAdUnitPath(), slot.getSlotId().getDomId());
	frequencyCount = JSON.parse(localStorage.getItem(pathName));
	frequencyCount.viewedSlotDetails[slot.getSlotId().getDomId()] = (frequencyCount.viewedSlotDetails[slot.getSlotId().getDomId()] || 0) + 1;
	localStorage.setItem(pathName, JSON.stringify(frequencyCount));
};

export let init = () => {
	var slot1;
	var slot2;
	var globalModuleConfig = {
		enabled: true,
		firePixels: true,
		customMatchFunction: function(bid, slot){
			// console.log('using custom match function....');
			return bid.adUnitCode === slot.getAdUnitPath();
		}
	}
	window.googletag = window.googletag || {};
	window.googletag.cmd = window.googletag.cmd || [];
	window.googletag.cmd.push(() => {
	  window.googletag.pubads().addEventListener(GPT_IMPRESSION_VIEWABLE_EVENT, function(event) {
		impressionViewableHandler(globalModuleConfig, event.slot, event);
	  });
	});
	
	events.on(CONSTANTS.EVENTS.AUCTION_INIT, () => {
		var requestCnt = window.owpbjs.adUnits.length;
		frequencyCount.identityPartners = Object.keys(window.PWT.identityPartners);
		slot1 = window.owpbjs.adUnits[0].code;
		slot2 = window.owpbjs.adUnits[1].code;
		frequencyCount.perSlotFreqCnt = {
			[slot1]: {
				bidServed: 0,
				impressionServed: 0,
				requestCnt: 1
			},
			[slot2]: {
				bidServed: 0,
				impressionServed: 0,
				requestCnt: 1
			}
		}
		frequencyCount.requestCnt = requestCnt;
		if(localStorage.getItem(pathName) !== null) {
			frequencyCount = JSON.parse(localStorage.getItem(pathName));
			frequencyCount.requestCnt = frequencyCount.requestCnt + requestCnt;
			frequencyCount.pageView = frequencyCount.pageView + 1;
			frequencyCount.bidServed = frequencyCount.bidServed;
			frequencyCount.perSlotFreqCnt[slot1].requestCnt = frequencyCount.perSlotFreqCnt[slot1].requestCnt + 1; 
			frequencyCount.perSlotFreqCnt[slot2].requestCnt = frequencyCount.perSlotFreqCnt[slot2].requestCnt + 1; 
		}
    })
	events.on(CONSTANTS.EVENTS.BID_RESPONSE, (bid) => {
		if(bid.cpm > 0) {
			frequencyCount.bidServed = frequencyCount.bidServed + 1;
			frequencyCount.perSlotFreqCnt[bid.adUnitCode].bidServed = frequencyCount.perSlotFreqCnt[bid.adUnitCode].bidServed + 1;
		}
    })
	events.on(CONSTANTS.EVENTS.AUCTION_END, () => {
		localStorage.setItem(pathName, JSON.stringify(frequencyCount));
    })
	events.on(CONSTANTS.EVENTS.AD_RENDER_SUCCEEDED, () => {
		//console.log('I am calling from renderer');
    })
	events.on(CONSTANTS.EVENTS.BID_WON, (bid) => {
		//console.log('I am calling from bid won event', bid);
		frequencyCount = JSON.parse(localStorage.getItem(pathName));
		frequencyCount.impressionServed = frequencyCount.impressionServed + 1;
		frequencyCount.perSlotFreqCnt[bid.adUnitCode].impressionServed = frequencyCount.perSlotFreqCnt[bid.adUnitCode].impressionServed + 1; 
		localStorage.setItem(pathName, JSON.stringify(frequencyCount));
    })
}  
init()
