define([
    'core/js/adapt',
    'core/js/models/componentModel',
    './pageNudge',
    './trickleNudge'
], function(Adapt, ComponentModel) {

    Adapt.nudge = _.extend({

        courseDefaults: {
            '_isEnabled':true,
            '_nonInteractiveComponents': {
                '_autoAssign': true,
                '_components': [
                    'assessmentResults',
                    'blank',
                    'graphic',
                    'text'
                ]
            },
            '_isScrollEnabled': true,
            '_isPlpEnabled': true,
            '_isTrickleEnabled': true,
            '_isTrackingEnabled':true,
            '_isPageCompletionEnabled':true,
            '_nudgePlpBeforeScroll': false,
            '_showScrollNudgeOnlyOnce': false,
            '_hasUserGotScroll':false,
            '_hasUserGotPlp':false,
            '_hasUserGotTrickle':false,
            '_hasUserGotPageCompletion':false,
            '_hasPlpBeenOpened':false,
            '_hasBackButtonBeenClicked':false,
            '_visibilityThreshold':33,
            '_wait':5000,
            '_debug': false
        },

        pageDefaults: {
            '_isScrollEnabled': true,
            '_isPlpEnabled': true,
            '_isTrickleEnabled': true,
            '_isPageCompletionEnabled':true,
            '_showScrollNudgeOnlyOnce': false,
            '_completionNudgeTarget': '.navigation-back-button',
            '_wait':5000
        },

        componentDefaults: {
            '_visibilityThreshold':33
        },

        debug:false,

        initialize: function() {
            this.listenToOnce(Adapt, 'app:dataReady', this.setup);
            this.saveState = _.throttle(_.bind(this.saveState, this), 500);
        },

        setup:function() {
            var courseConfig = this.getConfig();

            this.debug = courseConfig._debug;

            if (courseConfig._nonInteractiveComponents._autoAssign) {
                Adapt.components.each(function(c) {
                    var componentConfig = this.getConfig(c);
                    if (_.indexOf(courseConfig._nonInteractiveComponents._components, c.get('_component')) != -1) {
                        componentConfig._isNonInteractive = componentConfig._isNonInteractive !== false;
                    }
                }, this);
            }

            this.restoreState();
            this.addListeners();
        },

        isEnabled: function() {
            var config = this.getConfig();
            return config && config._isEnabled;
        },

        getDefaults:function(model) {
            if (model == Adapt.course) return this.courseDefaults;
            if (model instanceof ComponentModel) return this.componentDefaults;
            return this.pageDefaults;
        },

        getConfig:function(model) {
            if (!model) model = Adapt.course;
            if (model.get('_isNudgeConfigured')) return model.get('_nudge');

            var defaults = this.getDefaults(model);
            var cfg = model.get('_nudge');

            model.set({
                '_nudge':_.extend({}, defaults, cfg),
                '_isNudgeConfigured': true
            });

            return model.get('_nudge');
        },

        restoreState:function() {
            var cfg = this.getConfig();

            if (!cfg._isTrackingEnabled) return;

            if (!require.defined('extensions/adapt-contrib-spoor/js/serializers/scormSuspendDataSerializer')) {
                return console.error('adapt-nudge: tracking enabled but adapt-contrib-spoor not found');
            }

            var data = Adapt.offlineStorage.get('nudge');

            if (!data) return;

            require('extensions/adapt-contrib-spoor/js/serializers/scormSuspendDataSerializer');

            data = SCORMSuspendData.deserialize(data);
            var i = 0;

            cfg._hasUserGotScroll = data[i++];
            cfg._hasUserGotPlp = data[i++];
            cfg._hasUserGotTrickle = data[i++];
            cfg._hasUserGotPageCompletion = data[i++];
            cfg._hasPlpBeenOpened = data[i++];
            cfg._hasBackButtonBeenClicked = data[i++];

            Adapt.contentObjects.each(function(co) {
                cfg = this.getConfig(co);
                cfg._isScrollEnabled = data[i++];
                cfg._isPlpEnabled = data[i++];
                cfg._isTrickleEnabled = data[i++];
                cfg._isPageCompletionEnabled = data[i++];
            }, this);
        },

        saveState:function() {
            var cfg = this.getConfig();

            if (cfg._isTrackingEnabled && SCORMSuspendData) {
                Adapt.offlineStorage.set('nudge', SCORMSuspendData.serialize(this._getData()));
            }
        },

        addListeners:function() {
            this.listenToOnce(Adapt, 'navigation:backButton', this.onNavigationBackButtonClicked);
        },

        _getData:function() {
            var cfg = this.getConfig();
            var data = [];

            data.push(cfg._hasUserGotScroll, cfg._hasUserGotPlp, cfg._hasUserGotTrickle, cfg._hasUserGotPageCompletion, cfg._hasPlpBeenOpened, cfg._hasBackButtonBeenClicked);

            Adapt.contentObjects.each(function(co) {
                cfg = this.getConfig(co);
                data.push(cfg._isScrollEnabled, cfg._isPlpEnabled, cfg._isTrickleEnabled, cfg._isPageCompletionEnabled);
            }, this);

            return data;
        },

        onNavigationBackButtonClicked:function() {
            this.getConfig()._hasBackButtonBeenClicked = true;
            this.saveState();
        }
    }, Backbone.Events);

    Adapt.once('courseModel:dataLoaded', function() {
        if (Adapt.nudge.isEnabled()) Adapt.nudge.initialize();
    });
});
