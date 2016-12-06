define([
    'coreJS/adapt',
    './pageNudge'
], function(Adapt) {

    Adapt.nudge = _.extend({

        defaults: {
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
            '_visibilityThreshold':33,
            "_wait":5000,
        },

        initialize: function() {
            this.listenToOnce(Adapt, 'app:dataReady', this.setup);
        },

        setup:function() {
            var courseConfig = this.getConfig();

            _.extend({}, this.defaults, courseConfig);

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

        getConfig: function(model) {
            if (!model) model = Adapt.course;
            if (!model.has('_nudge')) {
                model.set('_nudge', {'_isEnabled':true});
            }
            return model.get("_nudge");
        },
    }, Backbone.Events);

    Adapt.once('courseModel:dataLoaded', function() {
        Adapt.nudge.initialize();
    });
});