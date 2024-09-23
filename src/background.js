const Background = {
  main: async function() {
    await Opts.init();
    await Communication.init();
  },
};

Background.main();