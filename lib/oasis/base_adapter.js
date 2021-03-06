import RSVP from "rsvp";

import Logger from "oasis/logger";
import { mustImplement } from "oasis/util";
import { addEventListener, removeEventListener } from "oasis/shims";

import { configuration } from "oasis/config";
import { handlers } from "oasis/globals";
import { connectCapabilities } from "oasis/connect";
import { PostMessageMessageChannel } from "oasis/message_channel";

function getBase () {
  var link = document.createElement("a");
  link.href = "!";
  var base = link.href.slice(0, -1);

  return base;
}

function BaseAdapter() {
}

BaseAdapter.prototype = {
  loadScripts: mustImplement('BaseAdapter', 'loadScripts'),

  oasisURL: function(sandbox) {
    return sandbox.options.oasisURL || configuration.oasisURL || 'oasis.js.html';
  },

  createChannel: function(sandbox) {
    var channel = new PostMessageMessageChannel();
    channel.port1.start();
    return channel;
  },

  environmentPort: function(sandbox, channel) {
    return channel.port1;
  },

  sandboxPort: function(sandbox, channel) {
    return channel.port2;
  },

  proxyPort: function(sandbox, port) {
    return port;
  },

  connectSandbox: function (receiver, ports) {
    var adapter = this;

    Logger.log("Sandbox listening for initialization message");

    function initializeOasisSandbox(event) {
      if (!event.data.isOasisInitialization) { return; }

      removeEventListener(receiver, 'message', initializeOasisSandbox);

      configuration.eventCallback(function () {
        Logger.log("Sandbox received initialization message.");

        configuration.oasisURL = event.data.oasisURL;

        adapter.loadScripts(event.data.base, event.data.scriptURLs);

        connectCapabilities(event.data.capabilities, event.ports);

        adapter.didConnect();
      });
    }
    addEventListener(receiver, 'message', initializeOasisSandbox);

    adapter.oasisLoaded();
  },

  createInitializationMessage: function (sandbox) {
    var sandboxURL = sandbox.options.url,
        dependencies = sandbox.dependencies || [],
        scriptURLs = sandbox.type === 'js' ?  [sandboxURL].concat(dependencies) : dependencies;

    return {
      isOasisInitialization: true,
      capabilities: sandbox._capabilitiesToConnect,
      base: getBase(),
      scriptURLs: scriptURLs,
      oasisURL: this.oasisURL(sandbox)
    };
  },

  // protected
  oasisLoadedMessage: "oasisSandboxLoaded",
  sandboxInitializedMessage:  "oasisSandboxInitialized"
};

export default BaseAdapter;
