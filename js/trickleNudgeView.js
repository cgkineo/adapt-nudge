define([
    'coreJS/adapt'
], function(Adapt) {

    var TrickleNudgeView = Backbone.View.extend({

        className:"trickle-nudge",

        events: {
            'click button':'onButtonClicked'
        },

        initialize:function() {
            this.state = {
                '_isVisible':null,
                '_$trickleComponent':null
            };

            this.render();
            this.setVisible(false);
        },

        render:function() {
            this.$el.html(Handlebars.templates['trickleNudge']());
            return this;
        },

        remove:function() {
            this.$el.remove();
        },

        setTarget:function($trickleComponent) {
            this.state._$trickleComponent = $trickleComponent;
        },

        setVisible: function(visible) {
            if (this.state._isVisible == visible) return;

            this.state._isVisible = visible;
            this.$el.toggleClass('display-none', !visible)
            
            if (visible) {
                this.$el.css('bottom', $('.trickle-button-inner', this.state._$trickleComponent).outerHeight());
            }
        },

        onButtonClicked:function() {
            Adapt.trigger('nudge:userGotIt', this);
        }
    });

    return TrickleNudgeView;
});