define([
    'coreJS/adapt',
    'coreModels/componentModel',
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
            '_visibilityThreshold':33,
            '_wait':5000
        },

        pageDefaults: {
            '_isScrollEnabled': true,
            '_isPlpEnabled': true,
            '_isTrickleEnabled': true,
            '_wait':5000
        },

        componentDefaults: {
            '_visibilityThreshold':33
        },

        debug:true,

        initialize: function() {
            this.listenToOnce(Adapt, 'app:dataReady', this.setup);
        },

        setup:function() {
            var courseConfig = this.getConfig();

            if (courseConfig._nonInteractiveComponents._autoAssign) {
                Adapt.components.each(function(c) {
                    var componentConfig = this.getConfig(c);
                    if (_.indexOf(courseConfig._nonInteractiveComponents._components, c.get('_component')) != -1) {
                        componentConfig._isNonInteractive = componentConfig._isNonInteractive !== false;
                    }
                }, this);
            }
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

            if (!cfg) {
                model.set('_nudge', _.extend({}, defaults));
            } else {
                _.extend(cfg, defaults, cfg);
            }

            model.set('_isNudgeConfigured', true);

            return model.get('_nudge');
        }
    }, Backbone.Events);

    Adapt.once('courseModel:dataLoaded', function() {
        Adapt.nudge.initialize();
    });
});