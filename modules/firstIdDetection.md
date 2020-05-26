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
    firstPartyId:{
      captureemail":[
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
      whiteListedModules":["britepool"],
      whiteListedModuleType":["bidder","userId"]
    }
  }
```


