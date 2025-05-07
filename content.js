(async () => {
  // Configuration
  const SALE_PERCENTAGE = 50; // 50% off
  const today = new Date();
  const monthNames = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
  const nouns = ["TABLE", "CHAIR", "BOOK", "LAMP", "VASE", "CUP", "PLATE", "BOWL", "RING", "CANDLE"];
  const MM_DD_YYYY = today.toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" }); // MM/DD/YYYY
  const YYYY_MM_DD = today.toISOString().split("T")[0]; // YYYY-MM-DD

  // Random delay function to mimic human behavior
  const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
  const randomDelay = () => sleep(1000 + Math.random() * 2000); // 1–3 seconds

  // Polling function to wait for an element with multiple selectors
  const waitForElement = async (selectors, timeout = 120000) => {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      for (const selector of selectors) {
        const element = document.querySelector(selector);
        if (element) {
          console.log(`Found element with selector: ${selector}`);
          return element;
        }
      }
      await sleep(250); // Faster retries
    }
    console.error(`Timeout waiting for element. Tried selectors: ${selectors.join(", ")}`);
    return null;
  };

  // Wait for page to be fully loaded
  const waitForPageLoad = async () => {
    console.log("Waiting for page to load...");
    const pageLoadSelectors = [
      "div.wt-overlay__footer", // Footer container
      "form", // Form element
      "div.wt-overlay__sticky-footer-container" // Sticky footer
    ];
    const pageElement = await waitForElement(pageLoadSelectors, 60000); // 60s timeout for page load
    if (!pageElement) {
      console.error("Page load timeout: critical page element not found");
      throw new Error("Page load timeout");
    }
    console.log("Page load complete");
    await sleep(1000); // Additional delay to ensure stability
  };

  // Dispatch comprehensive events for date picker compatibility
  const dispatchDateInputEvents = async (element, value) => {
    element.focus();
    console.log(`Focused element: ${element.tagName}`);
    element.value = value;
    const events = [
      new KeyboardEvent("keydown", { bubbles: true, cancelable: true }),
      new KeyboardEvent("keypress", { bubbles: true, cancelable: true }),
      new Event("input", { bubbles: true, cancelable: true }),
      new Event("change", { bubbles: true, cancelable: true }),
      new Event("blur", { bubbles: true, cancelable: true }),
      new Event("mouseup", { bubbles: true, cancelable: true }),
      new Event("focusout", { bubbles: true, cancelable: true })
    ];
    events.forEach(event => {
      element.dispatchEvent(event);
      console.log(`Dispatched ${event.type} event for element: ${element.tagName}, value: ${value}`);
    });
    await sleep(500); // Brief pause to allow field to process
  };

  // Dismiss date picker using multiple methods
  const dismissDatePicker = async (dateInput, calendarIcon) => {
    // Method 1: Repeatedly blur the date input
    if (dateInput) {
      dateInput.blur();
      dateInput.dispatchEvent(new Event("blur", { bubbles: true }));
      dateInput.dispatchEvent(new Event("focusout", { bubbles: true }));
      dateInput.dispatchEvent(new Event("mouseup", { bubbles: true }));
      console.log("Dismiss attempt 1: Blurred date input (1)");
      await sleep(1000);
      dateInput.blur();
      dateInput.dispatchEvent(new Event("focusout", { bubbles: true }));
      console.log("Dismiss attempt 2: Blurred date input (2)");
      await sleep(1000);
      // Verify the date is set
      if (!dateInput.value) {
        console.error("Date input value not set after dismissal");
        throw new Error("Date input value not set");
      }
      console.log(`Date input value confirmed: ${dateInput.value}`);
    }

    // Method 2: Click the optional text field
    const textField = await waitForElement(["textarea[id='additional-details']"]);
    if (textField) {
      textField.click();
      textField.dispatchEvent(new Event("mouseup", { bubbles: true }));
      textField.dispatchEvent(new Event("focusout", { bubbles: true }));
      console.log("Dismiss attempt 3: Clicked optional text field");
      await sleep(1000);
    }

    // Method 3: Click the footer container
    const footer = document.querySelector("div.wt-overlay__footer");
    if (footer) {
      footer.click();
      footer.dispatchEvent(new Event("mouseup", { bubbles: true }));
      console.log("Dismiss attempt 4: Clicked footer container");
      await sleep(1000);
    }

    // Method 4: Toggle calendar icon
    if (calendarIcon) {
      calendarIcon.click();
      console.log("Dismiss attempt 5: Toggled calendar icon");
      await sleep(1000);
    }

    // Method 5: Click body
    const body = document.querySelector("body");
    if (body) {
      body.click();
      body.dispatchEvent(new Event("mouseup", { bubbles: true }));
      console.log("Dismiss attempt 6: Clicked body");
      await sleep(1000);
    }

    // Final delay to ensure validation
    console.log("Final delay to ensure date field validation");
    await sleep(2000);
  };

  // Dismiss generic input field (e.g., coupon code)
  const dismissField = async (input) => {
    // Method 1: Blur the input
    if (input) {
      input.blur();
      input.dispatchEvent(new Event("blur", { bubbles: true }));
      input.dispatchEvent(new Event("focusout", { bubbles: true }));
      input.dispatchEvent(new Event("mouseup", { bubbles: true }));
      console.log("Dismiss field attempt 1: Blurred input");
      await sleep(1000);
      // Verify the value is set
      if (!input.value) {
        console.error("Input value not set after dismissal");
        throw new Error("Input value not set");
      }
      console.log(`Input value confirmed: ${input.value}`);
    }

    // Method 2: Click the optional text field
    const textField = await waitForElement(["textarea[id='additional-details']"]);
    if (textField) {
      textField.click();
      textField.dispatchEvent(new Event("mouseup", { bubbles: true }));
      textField.dispatchEvent(new Event("focusout", { bubbles: true }));
      console.log("Dismiss field attempt 2: Clicked optional text field");
      await sleep(1000);
    }

    // Method 3: Click the footer container
    const footer = document.querySelector("div.wt-overlay__footer");
    if (footer) {
      footer.click();
      footer.dispatchEvent(new Event("mouseup", { bubbles: true }));
      console.log("Dismiss field attempt 3: Clicked footer container");
      await sleep(1000);
    }

    // Method 4: Click body
    const body = document.querySelector("body");
    if (body) {
      body.click();
      body.dispatchEvent(new Event("mouseup", { bubbles: true }));
      console.log("Dismiss field attempt 4: Clicked body");
      await sleep(1000);
    }

    // Final delay to ensure validation
    console.log("Final delay to ensure field validation");
    await sleep(2000);
  };

  // Simulate a trusted click using a temporary DOM element
  const simulateTrustedClick = async (target) => {
    const tempButton = document.createElement("button");
    tempButton.style.position = "absolute";
    tempButton.style.opacity = "0";
    document.body.appendChild(tempButton);
    tempButton.onclick = () => {
      target.dispatchEvent(new MouseEvent("click", {
        bubbles: true,
        cancelable: true,
        view: window,
        clientX: 100,
        clientY: 100
      }));
    };
    tempButton.click();
    await sleep(100);
    document.body.removeChild(tempButton);
    console.log("Dispatched trusted click via temporary button");
  };

  // Serialize form data for debugging
  const serializeFormData = (form) => {
    if (!form) return {};
    const formData = new FormData(form);
    const data = {};
    for (const [key, value] of formData.entries()) {
      data[key] = value;
    }
    return data;
  };

  // Send status to popup
  const sendStatus = (message) => {
    chrome.runtime.sendMessage({ action: "updateStatus", status: message });
  };

  try {
    sendStatus("Starting sale setup...");

    // Wait for page to load
    await waitForPageLoad();

    // Step 1: Set percentage discount
    console.log("Step 1: Setting percentage discount...");
    const percentageSelectors = [
      "select[id='reward-percentage']",
      "select[name='reward_type_percent_dropdown']"
    ];
    const percentageSelect = await waitForElement(percentageSelectors);
    if (percentageSelect) {
      dispatchDateInputEvents(percentageSelect, SALE_PERCENTAGE.toString());
      console.log("Step 1: Set percentage discount to 50%");
    } else {
      sendStatus("Error: Percentage discount select not found");
      throw new Error("Percentage discount select not found");
    }
    await randomDelay();

    // Step 2: Set start date
    console.log("Step 2: Setting start date...");
    const startDateSelectors = [
      "input[aria-label='MM/DD/YYYY'][data-datepicker-input='true']",
      "input[id*='date-input-'][aria-current='date']"
    ];
    const startDateInput = await waitForElement(startDateSelectors);
    if (startDateInput) {
      // Click calendar icon to open date picker
      const startCalendarIcon = await waitForElement([
        "span.ss-icon.ss-calendar",
        "span[aria-label='Toggle date picker']"
      ]);
      if (startCalendarIcon) {
        startCalendarIcon.click();
        console.log("Step 2: Clicked start date calendar icon");
        await sleep(500);
      }
      // Try YYYY-MM-DD first
      dispatchDateInputEvents(startDateInput, YYYY_MM_DD);
      console.log(`Step 2: Set start date to ${YYYY_MM_DD}`);
      // If invalid, try MM/DD/YYYY
      if (!startDateInput.value) {
        dispatchDateInputEvents(startDateInput, MM_DD_YYYY);
        console.log(`Step 2: Fallback - Set start date to ${MM_DD_YYYY}`);
      }
      if (!startDateInput.value) {
        sendStatus("Error: Start date not set correctly");
        throw new Error("Start date not set correctly");
      }
      await dismissDatePicker(startDateInput, startCalendarIcon); // Dismiss start date picker
    } else {
      sendStatus("Error: Start date input not found");
      throw new Error("Start date input not found");
    }
    await randomDelay();

    // Step 3: Set end date
    console.log("Step 3: Setting end date...");
    const endDateSelectors = [
      "input[aria-label='MM/DD/YYYY'][data-datepicker-input='true']",
      "input[id*='date-input-'][aria-current='date']"
    ];
    const endDateInputs = document.querySelectorAll(endDateSelectors.join(", "));
    const endDateInput = Array.from(endDateInputs).find(input => input !== startDateInput) || await waitForElement(endDateSelectors);
    if (endDateInput) {
      // Click calendar icon to open date picker
      const endCalendarIcon = await waitForElement([
        "span.ss-icon.ss-calendar",
        "span[aria-label='Toggle date picker']"
      ]);
      if (endCalendarIcon) {
        endCalendarIcon.click();
        console.log("Step 3: Clicked end date calendar icon");
        await sleep(500);
      }
      // Try YYYY-MM-DD first
      dispatchDateInputEvents(endDateInput, YYYY_MM_DD);
      console.log(`Step 3: Set end date to ${YYYY_MM_DD}`);
      // If invalid, try MM/DD/YYYY
      if (!endDateInput.value) {
        dispatchDateInputEvents(endDateInput, MM_DD_YYYY);
        console.log(`Step 3: Fallback - Set end date to ${MM_DD_YYYY}`);
      }
      if (!endDateInput.value) {
        sendStatus("Error: End date not set correctly");
        throw new Error("End date not set correctly");
      }
      await dismissDatePicker(endDateInput, endCalendarIcon); // Dismiss end date picker
    } else {
      sendStatus("Error: End date input not found");
      throw new Error("End date input not found");
    }
    await randomDelay();

    // Step 4: Generate and set coupon code
    console.log("Step 4: Generating and setting coupon code...");
    const randomNoun = nouns[Math.floor(Math.random() * nouns.length)];
    const COUPON_CODE = `${monthNames[today.getMonth()]}${today.getDate()}${randomNoun}`; // e.g., MAR4TABLE
    const couponSelectors = [
      "input[id='name-your-coupon']",
      "input[name='promo_name']"
    ];
    const couponInput = await waitForElement(couponSelectors);
    if (couponInput) {
      dispatchDateInputEvents(couponInput, COUPON_CODE);
      console.log(`Step 4: Set coupon code to ${COUPON_CODE}`);
      await dismissField(couponInput); // Dismiss coupon code field
    } else {
      sendStatus("Error: Coupon code input not found");
      throw new Error("Coupon code input not found");
    }
    await randomDelay();

    // Step 5: Wait for all fields to be processed
    console.log("Waiting for form fields to be fully processed...");
    await sleep(2000); // 2-second delay after all fields

    // Step 6: Submit the sale (Got it button)
    console.log("Step 6: Looking for Got it button...");
    const submitSelectors = [
      "div.wt-overlay__footer__action button.wt-btn--filled[data-clg-id='WtButton'][data-wt-overlay-close='true']", // Precise match
      "div.wt-overlay__footer__action button.wt-btn--filled[data-clg-id='WtButton']", // Fallback
      "div[data-clg-id='WtOverlayFooterButton'] button.wt-btn--filled[data-clg-id='WtButton']",
      "button.wt-btn--filled[data-clg-id='WtButton']",
      "button.wt-btn--filled[data-wt-overlay-close='true']",
      "button.wt-btn--filled"
    ];
    const submitButton = await waitForElement(submitSelectors);
    if (submitButton) {
      console.log(`Step 6: Got it button found. Disabled: ${submitButton.disabled}, Text: ${submitButton.textContent.trim()}`);
      // Retry if button is disabled
      let attempts = 0;
      const maxAttempts = 10;
      while (submitButton.disabled && attempts < maxAttempts) {
        console.log(`Step 6: Got it button disabled, retrying (${attempts + 1}/${maxAttempts})...`);
        await sleep(1000);
        attempts++;
      }
      if (submitButton.disabled) {
        sendStatus("Error: Got it button remains disabled");
        throw new Error("Got it button remains disabled");
      }
      // Check form field validity
      console.log("Checking form field validity...");
      const invalidFields = document.querySelectorAll("input[aria-invalid='true'], select[aria-invalid='true']");
      if (invalidFields.length > 0) {
        console.error("Invalid fields detected:", invalidFields);
        sendStatus("Error: Invalid form fields detected");
        throw new Error("Invalid form fields detected");
      }
      console.log("All form fields appear valid");
      // Clear any residual focus
      const body = document.querySelector("body");
      if (body) {
        body.click();
        body.dispatchEvent(new Event("mouseup", { bubbles: true }));
        console.log("Cleared focus by clicking body");
        await sleep(1000);
      }
      // Pre-click delay to ensure form/overlay readiness
      console.log("Pre-click delay for Got it button");
      await sleep(12000); // 12-second delay
      // Simulate hover and focus
      submitButton.dispatchEvent(new MouseEvent("mouseover", { bubbles: true, cancelable: true }));
      console.log("Step 6: Dispatched mouseover on Got it button");
      await sleep(500);
      submitButton.focus();
      console.log("Step 6: Focused Got it button");
      await sleep(500);
      // Multiple click attempts over 5 seconds
      for (let i = 1; i <= 5; i++) {
        console.log(`Step 6: Checking button state before click (${i}/5). Disabled: ${submitButton.disabled}`);
        if (!submitButton.disabled) {
          await simulateTrustedClick(submitButton);
          submitButton.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, cancelable: true }));
          console.log(`Step 6: Dispatched pointerdown on Got it button (${i}/5)`);
          await sleep(50);
          submitButton.dispatchEvent(new PointerEvent("pointerup", { bubbles: true, cancelable: true }));
          console.log(`Step 6: Dispatched pointerup on Got it button (${i}/5)`);
        } else {
          console.log(`Step 6: Skipped click due to disabled button (${i}/5)`);
        }
        await sleep(1000); // 1-second delay between clicks
      }
    } else {
      sendStatus("Error: Got it button not found");
      throw new Error("Got it button not found");
    }
    await randomDelay();

    // Step 7: Handle next screen (confirmation)
    console.log("Step 7: Looking for confirmation button on next screen...");
    const confirmSelectors = [
      "button.wt-btn--filled[data-action*='confirm']",
      "button.wt-btn--filled[aria-label*='Confirm']",
      "button.wt-btn--filled[aria-label*='Save']",
      "button.wt-btn--filled:not(.wt-btn--outline)",
      "button[type='submit'][class*='wt-btn--filled']",
      "button[data-action*='save']",
      "button.wt-btn--filled" // Broad selector for confirmation
    ];
    const confirmButton = await waitForElement(confirmSelectors);
    if (confirmButton) {
      console.log(`Step 7: Confirmation button found. Disabled: ${confirmButton.disabled}, Text: ${confirmButton.textContent.trim()}`);
      // Retry if button is disabled
      let attempts = 0;
      const maxAttempts = 10;
      while (confirmButton.disabled && attempts < maxAttempts) {
        console.log(`Step 7: Confirmation button disabled, retrying (${attempts + 1}/${maxAttempts})...`);
        await sleep(1000);
        attempts++;
      }
      if (confirmButton.disabled) {
        sendStatus("Error: Confirmation button remains disabled");
        throw new Error("Confirmation button remains disabled");
      }
      // Check form field validity
      console.log("Step 7: Checking confirmation screen form validity...");
      const invalidFields = document.querySelectorAll("input[aria-invalid='true'], select[aria-invalid='true']");
      if (invalidFields.length > 0) {
        console.error("Step 7: Invalid fields detected:", invalidFields);
        sendStatus("Error: Invalid form fields detected on confirmation screen");
        throw new Error("Invalid form fields detected on confirmation screen");
      }
      // Log form data
      const form = document.querySelector("form");
      if (form) {
        const formData = serializeFormData(form);
        console.log("Step 7: Form data:", formData);
      } else {
        console.log("Step 7: No form found on confirmation screen");
      }
      console.log("Step 7: All form fields appear valid");
      // Clear any residual focus
      const body = document.querySelector("body");
      if (body) {
        body.click();
        body.dispatchEvent(new Event("mouseup", { bubbles: true }));
        console.log("Step 7: Cleared focus by clicking body");
        await sleep(1000);
      }
      // Pre-click delay to ensure confirmation screen readiness
      console.log("Step 7: Pre-click delay for confirmation button");
      await sleep(5000); // 5-second delay
      // Simulate hover and focus
      confirmButton.dispatchEvent(new MouseEvent("mouseover", { bubbles: true, cancelable: true }));
      console.log("Step 7: Dispatched mouseover on confirmation button");
      await sleep(500);
      confirmButton.focus();
      console.log("Step 7: Focused confirmation button");
      await sleep(500);
      // Multiple click attempts over 5 seconds
      for (let i = 1; i <= 5; i++) {
        console.log(`Step 7: Checking button state before click (${i}/5). Disabled: ${confirmButton.disabled}`);
        if (!confirmButton.disabled) {
          await simulateTrustedClick(confirmButton);
          confirmButton.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, cancelable: true }));
          console.log(`Step 7: Dispatched pointerdown on confirmation button (${i}/5)`);
          await sleep(50);
          confirmButton.dispatchEvent(new PointerEvent("pointerup", { bubbles: true, cancelable: true }));
          console.log(`Step 7: Dispatched pointerup on confirmation button (${i}/5)`);
        } else {
          console.log(`Step 7: Skipped click due to disabled button (${i}/5)`);
        }
        await sleep(1000); // 1-second delay between clicks
      }
      sendStatus("Sale setup completed successfully");
    } else {
      console.log("Step 7: No confirmation button found, assuming sale is complete");
      sendStatus("Sale setup completed successfully");
    }
  } catch (error) {
    console.error("Sale setup failed:", error.message);
    sendStatus(`Error: ${error.message}`);
  }
})();
