define([
    'coreJS/adapt'
], function(Adapt) {

    var PageNudgeView = Backbone.View.extend({

        className:"page-nudge",

        events: {
            'click button':'onButtonClicked'
        },

        initialize:function() {
            this.state = {
                '_isVisible':null,
                '_mode':'scroll'
            };

            this.render();
            this.setVisible(false);
        },

        render:function() {
            this.$el.html(Handlebars.templates['pageNudge']());
            this.$el.attr('data-mode', this.state._mode);
            return this;
        },

        remove:function() {
            this.$el.remove();
        },

        setVisible: function(visible) {
            if (this.state._isVisible == visible) return;
            this.state._isVisible = visible;
            this.$el.toggleClass('display-none', !visible);

            if (visible) {
                if (this.state._mode == 'plp') {
                    var $plp = $('.page-level-progress-navigation');
                    var margin = ($plp.position().left - this.$('.plp-nudge').position().left) + $plp.outerWidth()/2;
                    this.$('.plp-nudge .triangle').css('margin-left', margin - this.$('.plp-nudge .triangle').outerWidth()/2);
                } else if (this.state._mode == 'complete') {
                    var $back = $('.navigation-back-button');
                    var margin = ($back.position().left - this.$('.complete-nudge').position().left) + $back.outerWidth()/2;
                    this.$('.complete-nudge .triangle').css('margin-left', margin - this.$('.complete-nudge .triangle').outerWidth()/2);
                }
            }
        },

        setMode:function(mode) {
            this.state._mode = mode;
            this.$el.attr('data-mode', this.state._mode);
        },

        onButtonClicked:function() {
            Adapt.trigger('nudge:userGotIt', this);
        }
    });

    return PageNudgeView;
});