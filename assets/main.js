$(function() {
  var client = ZAFClient.init();
  client.invoke('hide');
  checkTicketForm(client);
});

function checkTicketForm(client) {
  client.get('ticket.form.id').then((formData) => {
    let formID = formData["ticket.form.id"];
    if(formID === 360001968354 || formID === 360002121813){
      client.invoke('show');
      client.invoke('resize', { width: '100%', height: '200px'});
      // showToggleButton();
      setupListeners(client);
      setupButtonListeners(client);
      client.invoke('ticketFields:custom_field_360030384953.disable');
      client.invoke('ticketFields:custom_field_360028491293.disable');
      populateTotals(client);
    } else {
      client.invoke('hide');
    }
  });
}

function approveClaim(client) {
  client.get('ticket.id').then((ticketData) => {
    var settings = {
      url: '/api/v2/tickets/' + ticketData['ticket.id'] + '.json',
      type:'PUT',
      dataType: 'json',
      contentType: 'application/json',
      data: JSON.stringify({"ticket":{"custom_fields":[{"id":360028491293,"value":"claim_waiting_finance_approval"}]}})
    };

    client.request(settings).then(
      function(data) {
        console.log("Success: ", data);
      },
      function(response) {
        console.error(response);
      }
    );
  });
}

function rejectClaim(client) {
  client.get('ticket.id').then((ticketData) => {
    var settings = {
      url: '/api/v2/tickets/' + ticketData['ticket.id'] + '.json',
      type:'PUT',
      dataType: 'json',
      contentType: 'application/json',
      data: JSON.stringify({"ticket":{"custom_fields":[{"id":360028491293,"value":"claim_rejected"}]}})
    };

    client.request(settings).then(
      function(data) {
        console.log("Success: ", data);
      },
      function(response) {
        console.error(response);
      }
    );
  });
}

function setupButtonListeners(client) {
  $("#toggle-btn").click(function(event) {
    let toggleElement = $("#toggle-btn");
    toggleState(toggleElement, client);
  });
  $("#approve-btn").click(function(event) {
    approveClaim(client);
  });
  $("#reject-btn").click(function(event) {
    rejectClaim(client);
  });
}

function toggleState(toggleElement, client) {
  let toggle_data;
  if(toggleElement.text() === "Toggle On"){
    toggleElement.text("Toggle Off");
    toggleElement.removeClass("c-btn c-btn--full").addClass("c-btn c-btn--full is-active");
    client.invoke('disableSave');
    // disableListeners(client);
  } else {
    toggleElement.text("Toggle On");
    toggleElement.removeClass("c-btn c-btn--full is-active");
    toggleElement.addClass("c-btn c-btn--full");
    client.invoke('enableSave');
    // setupListeners(client);
  }
  toggleApprovalButtons();
}

function toggleApprovalButtons() {
  $("#approval_button_content").toggle();
}

function showToggleButton() {
  let toggle_data = {
    'toggle_state': "On"
  }

  var source = $("#toggle-template").html();
  var template = Handlebars.compile(source);
  $("#toggle_content").html(template(toggle_data));
}

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

function setupListeners(client){
  client.on('ticket.custom_field_360029611774.changed', function() {
    populateTotals(client);
  });
  client.on('ticket.custom_field_360029612094.changed', function() {
    populateTotals(client);
  });
  client.on('ticket.custom_field_360029612174.changed', function() {
    populateTotals(client);
  });
}

function populateTotals(client) {
  return client.get('ticket.customField:custom_field_360029611774').then((dataOne) => {
    let expenseOneTotal = Number(dataOne["ticket.customField:custom_field_360029611774"])
    console.log("expenseOne: ", expenseOneTotal)

    return client.get('ticket.customField:custom_field_360029612094').then((dataTwo) => {
      let expenseTwoTotal = Number(dataTwo["ticket.customField:custom_field_360029612094"])
      console.log("expenseTwo: ", expenseTwoTotal)

      return client.get('ticket.customField:custom_field_360029612174').then((dataThree) => {
        let expenseThreeTotal = Number(dataThree["ticket.customField:custom_field_360029612174"])
        console.log("expenseThree: ", expenseThreeTotal)
        let totalAmount = expenseOneTotal + expenseTwoTotal + expenseThreeTotal;
        console.log("totalAmount: ", totalAmount)
        let ticket_data = {
          'total_claim_amount': totalAmount.toFixed(2)
        }

        updateTotalClaimAmount(client, totalAmount);
        determineApprovalLevel(client, totalAmount);
        var source = $("#total-template").html();
        var template = Handlebars.compile(source);
        var html = template(ticket_data);
        $("#total_content").html(html);
      })
    })
  })
}

function updateTotalClaimAmount(client, totalAmount){
  client.set('ticket.customField:custom_field_360030384953', totalAmount.toFixed(2)).then(function(data){
    console.log("Total Claim Amount Updated");
  });
}

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
