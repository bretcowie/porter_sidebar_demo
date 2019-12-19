var metadata;
var totalFields;
var currencyFields;
var supportedForms;
var batchDateFieldId;

$(function() {
  var client = ZAFClient.init();
  client.invoke('hide');
  client.metadata().then(function(data) {
    metadata = data;
    batchDateFieldId = metadata.settings.batch_date_field_id;
    console.log("Metadata: ", metadata);
    checkTicketForm(client);
  });
});

function checkTicketForm(client) {
  client.get('ticket.form.id').then((formData) => {
    let formID = formData["ticket.form.id"].toString();
    supportedForms = metadata.settings.ticket_forms.split(",");
    if(supportedForms.includes(formID)){
      client.invoke('show');
      client.invoke('resize', { width: '100%', height: '200px'});
      // showToggleButton();
      setupListeners(client);
      //setupButtonListeners(client);
      client.invoke('ticketFields:custom_field_' + metadata.settings.claim_status + '.disable');
      client.invoke('ticketFields:custom_field_' + metadata.settings.claim_usd + '.disable');
      client.invoke('ticketFields:custom_field_' + metadata.settings.claim_cad + '.disable');
      // client.invoke('ticketFields:custom_field_360030384953.disable');
      // client.invoke('ticketFields:custom_field_360028491293.disable');
      populateTotals(client);
    } else {
      client.invoke('hide');
    }
  });
}

function setupListeners(client){
  totalFields = metadata.settings.total_fields.split(",");
  currencyFields = metadata.settings.currency_fields.split(",");
  for (i = 0; i < totalFields.length; i++){
    client.on('ticket.custom_field_' + totalFields[i] + '.changed', function(){
      populateTotals(client);
    });
  }
  for (i = 0; i < currencyFields.length; i++){
    client.on('ticket.custom_field_' + currencyFields[i] + '.changed', function(){
      populateTotals(client);
    });
  }
  claimStatusField = metadata.settings.claim_status;
  client.on('ticket.custom_field_' + claimStatusField + '.changed', function(){
    checkClaimStatus(client);
  });
}

function generateCustomFieldStringsFromArray(arrayOfIds){
  var fieldStrings = [];
  for (i = 0; i < arrayOfIds.length; i++){
    fieldStrings.push('ticket.customField:custom_field_' + arrayOfIds[i]);
  }
  return fieldStrings;
}

function generateCustomFieldStringFromId(fieldId) {
  return 'ticket.customField:custom_field_' + fieldId;
}

function checkClaimStatus(client) {
  let fieldString = generateCustomFieldStringFromId(claimStatusField);
  return client.get(fieldString).then((data) => {
    let claimStatusValue = data[fieldString];
    if(claimStatusValue === metadata.settings.claim_approval_tag) {
      setBatchDate(client);
    } else {
      removeBatchDate(client);
    }
  });
}

function setBatchDate(client) {
  var d = new Date();
  var dateString = d.getFullYear().toString() + '-' + d.getMonth().toString() + '-' + d.getDate().toString();
  let batchDateFieldString = generateCustomFieldStringFromId(batchDateFieldId);
  client.set(batchDateFieldString, dateString).then(function(data){
    console.log("Batch Date Set:", dateString);
  });
}

function removeBatchDate(client) {
  let batchDateFieldString = generateCustomFieldStringFromId(batchDateFieldId);
  client.set(batchDateFieldString, "").then(function(data){
    console.log("Batch Date Removed");
  });
}

function populateTotals(client) {
  let totalFieldStrings = generateCustomFieldStringsFromArray(totalFields);
  let currencyFieldStrings = generateCustomFieldStringsFromArray(currencyFields);
  let allFieldStrings = totalFieldStrings.concat(currencyFieldStrings);
  return client.get(allFieldStrings).then((data) => {
    console.log("Field Data: ", data);
    let usdTotal = 0;
    let cadTotal = 0;
    for(i = 0; i < totalFieldStrings.length; i++){
      if(data[currencyFieldStrings[i]].includes('cad')){
        cadTotal += Number(data[totalFieldStrings[i]])
      } else if(data[currencyFieldStrings[i]].includes('usd')){
        usdTotal += Number(data[totalFieldStrings[i]])
      } else {
        //do nothing
      }
    }

    let totalAmount = usdTotal + cadTotal;

    let ticket_data = {
      'total_claim_amount_cad': cadTotal.toFixed(2),
      'total_claim_amount_usd': usdTotal.toFixed(2)
    }

    // updateTotalClaimAmount(client, totalAmount);
    updateClaimTotalAmounts(client, cadTotal, usdTotal);
    determineApprovalLevel(client, totalAmount);
    var source = $("#total-template").html();
    var template = Handlebars.compile(source);
    var html = template(ticket_data);
    $("#total_content").html(html);
  })
}
// function populateTotals(client) {
//   return client.get('ticket.customField:custom_field_360029611774').then((dataOne) => {
//     let expenseOneTotal = Number(dataOne["ticket.customField:custom_field_360029611774"])
//     console.log("expenseOne: ", expenseOneTotal)
//
//     return client.get('ticket.customField:custom_field_360029612094').then((dataTwo) => {
//       let expenseTwoTotal = Number(dataTwo["ticket.customField:custom_field_360029612094"])
//       console.log("expenseTwo: ", expenseTwoTotal)
//
//       return client.get('ticket.customField:custom_field_360029612174').then((dataThree) => {
//         let expenseThreeTotal = Number(dataThree["ticket.customField:custom_field_360029612174"])
//         console.log("expenseThree: ", expenseThreeTotal)
//         let totalAmount = expenseOneTotal + expenseTwoTotal + expenseThreeTotal;
//         console.log("totalAmount: ", totalAmount)
//         let ticket_data = {
//           'total_claim_amount': totalAmount.toFixed(2)
//         }
//
//         updateTotalClaimAmount(client, totalAmount);
//         determineApprovalLevel(client, totalAmount);
//         var source = $("#total-template").html();
//         var template = Handlebars.compile(source);
//         var html = template(ticket_data);
//         $("#total_content").html(html);
//       })
//     })
//   })
// }

function updateClaimTotalAmounts(client, cadTotal, usdTotal){
  let cadField = 'ticket.customField:custom_field_' + metadata.settings.claim_cad;
  let usdField = 'ticket.customField:custom_field_' + metadata.settings.claim_usd;
  client.set({[cadField]: cadTotal.toFixed(2), [usdField]: usdTotal.toFixed(2)}).then(function(data){
    console.log("Total Claim Amounts Updated");
  });
}

// function updateTotalClaimAmount(client, totalAmount){
//   client.set('ticket.customField:custom_field_360030384953', totalAmount.toFixed(2)).then(function(data){
//     console.log("Total Claim Amount Updated");
//   });
// }

function determineApprovalLevel(client, totalAmount){
  let approval_level;
  if(totalAmount < 2000){
    approval_level = "Manager";
    // client.set('ticket.customField:custom_field_360028491293','claim_waiting_manager_approval');
  } else if(totalAmount < 5000){
    approval_level = "Director";
    // client.set('ticket.customField:custom_field_360028491293','claim_waiting_director_approval');
  } else if(totalAmount < 25000) {
    approval_level = "Vice President";
    // client.set('ticket.customField:custom_field_360028491293','claim_waiting_vp_approval');
  } else {
    approval_level = "Executive Vice President";
    // client.set('ticket.customField:custom_field_360028491293','claim_waiting_evp_approval');
  }
  console.log("Approval Level: ", approval_level)
  let approval_data = {
    'approval_level': approval_level
  }

  var source = $("#approval-template").html();
  var template = Handlebars.compile(source);
  var html = template(approval_data);
  $("#approval_content").html(html);
}

function showTotal() {
  var ticket_data = {
    'total_claim_amount': '$1000'
  };

  var source = $("#total-template").html();
  var template = Handlebars.compile(source);
  var html = template(ticket_data);
  $("#content").html(html);
}

function showError() {
  var error_data = {
    'status': 404,
    'statusText': 'Not found'
  };
  var source = $("#error-template").html();
  var template = Handlebars.compile(source);
  var html = template(error_data);
  $("#content").html(html);
}

// function approveClaim(client) {
//   client.get('ticket.id').then((ticketData) => {
//     var settings = {
//       url: '/api/v2/tickets/' + ticketData['ticket.id'] + '.json',
//       type:'PUT',
//       dataType: 'json',
//       contentType: 'application/json',
//       data: JSON.stringify({"ticket":{"custom_fields":[{"id":360028491293,"value":"claim_waiting_finance_approval"}]}})
//     };
//
//     client.request(settings).then(
//       function(data) {
//         console.log("Success: ", data);
//       },
//       function(response) {
//         console.error(response);
//       }
//     );
//   });
// }
//
// function rejectClaim(client) {
//   client.get('ticket.id').then((ticketData) => {
//     var settings = {
//       url: '/api/v2/tickets/' + ticketData['ticket.id'] + '.json',
//       type:'PUT',
//       dataType: 'json',
//       contentType: 'application/json',
//       data: JSON.stringify({"ticket":{"custom_fields":[{"id":360028491293,"value":"claim_rejected"}]}})
//     };
//
//     client.request(settings).then(
//       function(data) {
//         console.log("Success: ", data);
//       },
//       function(response) {
//         console.error(response);
//       }
//     );
//   });
// }

// function setupButtonListeners(client) {
//   $("#toggle-btn").click(function(event) {
//     let toggleElement = $("#toggle-btn");
//     toggleState(toggleElement, client);
//   });
//   $("#approve-btn").click(function(event) {
//     approveClaim(client);
//   });
//   $("#reject-btn").click(function(event) {
//     rejectClaim(client);
//   });
// }

// function toggleState(toggleElement, client) {
//   let toggle_data;
//   if(toggleElement.text() === "Toggle On"){
//     toggleElement.text("Toggle Off");
//     toggleElement.removeClass("c-btn c-btn--full").addClass("c-btn c-btn--full is-active");
//     client.invoke('disableSave');
//     // disableListeners(client);
//   } else {
//     toggleElement.text("Toggle On");
//     toggleElement.removeClass("c-btn c-btn--full is-active");
//     toggleElement.addClass("c-btn c-btn--full");
//     client.invoke('enableSave');
//     // setupListeners(client);
//   }
//   toggleApprovalButtons();
// }
//
// function toggleApprovalButtons() {
//   $("#approval_button_content").toggle();
// }
//
// function showToggleButton() {
//   let toggle_data = {
//     'toggle_state': "On"
//   }
//
//   var source = $("#toggle-template").html();
//   var template = Handlebars.compile(source);
//   $("#toggle_content").html(template(toggle_data));
// }

// function disableListeners(client){
//   client.off('ticket.custom_field_360029611774.changed', function() {
//     populateTotals(client);
//   });
//   client.off('ticket.custom_field_360029612094.changed', function() {
//     populateTotals(client);
//   });
//   client.off('ticket.custom_field_360029612174.changed', function() {
//     populateTotals(client);
//   });
// }
