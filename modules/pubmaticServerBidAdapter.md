# Overview

```
Module Name:  PubMatic-Server Bid Adapter
Module Type:  Bidder Adapter
Maintainer: UOEDev@pubmatic.com
```

# Description

Connects to PubMatic exchange for bids.

PubMaticServer bid adapter supports Banner currently.

# Sample Ad Unit: For Publishers
```

var pbjs = pbjs || {};

pbjs.que.push(function() {

    var adUnits = [{
        code: 'test-div',
        sizes: [
            [300, 250],
            [728, 90]
        ],
        bids: [{
          bidder: 'pubmaticServer',
          params: {
            publisherId: '301',                  // required
            adSlot: '/15671365/DMDemo@728x90',   // required
            profileid: '',                       // required
            versionid: '',                       // optional (Default 1)
            divId: '',                           // optional

            // openRTB params
            lat: '40.712775',                    // optional
            lon: '-74.005973',                   // optional
            yob: '1982',                         // optional
            gender: 'M',                         // optional

            // PubMatic Specific Params
            pmzoneid: 'zone1, zone11',           // optional
            kadpageurl: 'www.test.com',          // optional							
            kadfloor: '0.50'                     // optional 									
          }
        }]
    }];
});

```
