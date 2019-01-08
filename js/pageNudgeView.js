define([
    'core/js/adapt',
    './enums/nudgeStateEnum'
], function(Adapt, NUDGE_STATE) {

    var PageNudgeView = Backbone.View.extend({

        className:"page-nudge",

        events: {
            'click button':'onButtonClicked'
        },

        initialize:function() {
            this.state = {
                '_isVisible':null,
                '_mode':NUDGE_STATE.SCROLL,
                '_completionTargetSelector':null
            };

            this.render();
            this.setVisible(false);
        },

        render:function() {
            var data = {
                _globals: Adapt.course.get('_globals')
            };
            this.$el.html(Handlebars.templates['pageNudge'](data));
            this.$el.attr('data-mode', this.state._mode.asString);
            return this;
        },

        remove:function() {
            this.$el.remove();
        },

        setCompletionTargetSelector:function(completionTargetSelector) {
            this.state._completionTargetSelector = completionTargetSelector;
        },

        setVisible: function(visible) {
            if (this.state._isVisible == visible) return;
            this.state._isVisible = visible;
            this.$el.toggleClass('display-none', !visible);

            if (visible) {
                if (this.state._mode == NUDGE_STATE.PLP) {
                    var $plp = $('.page-level-progress-navigation');
                    var margin = ($plp.position().left - this.$('.plp-nudge').position().left) + $plp.outerWidth()/2;
                    this.$('.plp-nudge .triangle').css('margin-left', margin - this.$('.plp-nudge .triangle').outerWidth()/2);
                } else if (this.state._mode == NUDGE_STATE.COMPLETE) {
                    var $target = $(this.state._completionTargetSelector);
                    var margin = ($target.position().left - this.$('.complete-nudge').position().left) + $target.outerWidth()/2;
                    this.$('.complete-nudge .triangle').css('margin-left', margin - this.$('.complete-nudge .triangle').outerWidth()/2);
                }
            }
        },

        setMode:function(mode) {
            this.state._mode = mode;
            this.$el.attr('data-mode', this.state._mode.asString);
        },

        onButtonClicked:function() {
            Adapt.trigger('nudge:userGotIt', this);
        }
    });

    return PageNudgeView;
});