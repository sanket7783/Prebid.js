# Overview

**Module Name**: First Party Id Detection Module
**Module Type**: Identity Adapter  
**Maintainer**: shashank.jain@pubmatic.com 

# Description

Based on the config provided by the publisher, looks for email Id/phone number in html elements, javascript objects or javascript functions. Also have a generic solution which attaches the 

# Test Parameters
```
gulp build –modules=firstIdDetection

  pbjs.setConfig:{
    firstPartyIdDetection:{ // TODO: Rename it to firstIdDetection
      "capturedata":[ // TODO: Rename it to Capture Data and Have a type to it.
          {type:"functionName",value:"getCustomData"},
          {type:"javascriptObject",value:"myData.user.email"},
          {type:"storedValue",value:{
            "spanId":"mySpanId"
          }},
          {type:"inputForm",value:{
            btnId:"myBtnId",
            inputId:"myInputId"
          }},
          {type:"genericSolution",value:true},
      ],
      dataType:"email" or "phone" or "generic or blank" // for validation of captured data
      // use filterSettings:{ as per userSync
        bidders:[]
        moduleTypes:[]
      }
     // remove this  whiteListedModules":["britepool","pubmaticBidAdapter"]
    }
  }
```


