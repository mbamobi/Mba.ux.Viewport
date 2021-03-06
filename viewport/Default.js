/**
 * @class Mba.ux.Viewport.viewport.Default
 * @override Ext.viewport.Default
 */
Ext.define('Mba.ux.Viewport.viewport.Default', {
    override: 'Ext.viewport.Default',
    requires: [
        'Mba.ux.Viewport.Navigation',
        'Ext.Menu'
    ],

    blockEvent: false,

    /**
     * @method
     * Bloqueia o evento backbutton
     *
     * @returns retorna fluent interface
     */
    blockEventBack: function() {
        this.blockEvent = true;
        return this;
    },

    /**
     * @method
     * Bloqueia o evento backbutton
     *
     * @returns retorna fluent interface
     */
    unBlockEventBack: function() {
        this.blockEvent = false;
        return this;
    },

    /**
     * @cfg {Boolean} autoNavigation
     * Navegeção automática registrando no {@link Mba.ux.Viewport.Navigation} com {@link #setActiveItem()}
     * e {@link #animateActiveItem()}
     * Também tem o mesmo comportamento do {@link #registerOnBack}
     */

    /**
     * @cfg {Boolean} registerOnBack
     * registra backbutton automático com execução do método {@link #onBack()}
     */

    /**
     * @private
     */
    navigation: null,

    /**
     * @method
     * Cria um objeto Navigation
     * @param {Object/Mba.ux.Viewport.Navigation} config
     * @return Mba.ux.Viewport.Navigation
     */
    createNavigation: function(config) {
        this.navigation = Ext.factory(config, Mba.ux.Viewport.Navigation, null, 'navigation');
        return this;
    },

    /**
     * @method
     * Atribui objeto Navigation
     * @param {Object/Mba.ux.Viewport.Navigation} navigation
     * @return {Mba.ux.Viewport.Navigation}
     */
    setNavigation: function(navigation) {
        return this.createNavigation(navigation);
    },

    /**
     * @method
     * Retorna o objeto Navigation
     * @return {Mba.ux.Viewport.Navigation}
     */
    getNavigation: function() {
        if (this.navigation === null) {
            this.setNavigation({});
        }

        return this.navigation;
    },

    constructor: function(config) {
        if (typeof config.registerOnBack === 'undefined') {
            config.registerOnBack = true;
        }

        if (config.registerOnBack) {
            var me = this;
            document.addEventListener('backbutton', function() {
                if (!me.blockEvent) {
                    me.onBack();
                }

            }, false);
        }

        if (config.navigation) {
            this.setNavigation(config.navigation);
            delete config.navigation;
        }

        this.callOverridden(arguments);
    },

    /**
     * @inheritdoc
     */
    add: function() {
        var item = this.callOverridden(arguments);

        if (this.config.autoNavigation) {
            if (this.allowAutoNavigation(item)) {
                this.getNavigation().orderHistory(item.xtype);
            }
        }

        return item;
    },

    /**
     * @private
     */
    allowAutoNavigation: function(item) {
        return  item.$className !== 'Ext.Toast' &&
               !item.isInnerItem() &&
                Ext.isFunction(item.getModal) &&
                item.getModal() &&
                item.$className !== 'Ext.MessageBox' &&
                !(item instanceof Ext.Menu);
    },

    /**
     * @private
     */
    doSetActiveItem: function(newActiveItem, oldActiveItem) {

        this.callOverridden(arguments);
        if (this.config.autoNavigation) {
            if (newActiveItem) {
                this.getNavigation().clearAutoNavigation(newActiveItem.xtype);
                this.getNavigation().orderHistory(newActiveItem.xtype);
            }
        }
    },

    setMenu: function(menu, config) {
        var me = this;
        config = config || {};

        // Temporary workaround for body shifting issue
        if (Ext.os.is.iOS && !this.hasiOSOrientationFix) {
            this.hasiOSOrientationFix = true;
            this.on('orientationchange', function() {
                window.scrollTo(0, 0);
            }, this);
        }

        if (!menu) {
            //<debug error>
            Ext.Logger.error('You must specify a side to dock the menu.');
            //</debug>
            return;
        }

        if (!config.side) {
            //<debug error>
            Ext.Logger.error('You must specify a side to dock the menu.');
            //</debug>
            return;
        }

        if (['left', 'right', 'top', 'bottom'].indexOf(config.side) == -1) {
            //<debug error>
            Ext.Logger.error('You must specify a valid side (left, right, top or botom) to dock the menu.');
            //</debug>
            return;
        }

        var menus = me.getMenus();

        if (!menus) {
            menus = {};
        }

        // Add a listener to show this menu on swipe
        if (!me.addedSwipeListener) {
            me.addedSwipeListener = true;

            me.element.on({
                tap: me.onTap,
                swipestart: me.onSwipeStart,
                edgeswipestart: me.onEdgeSwipeStart,
                edgeswipe: me.onEdgeSwipe,
                edgeswipeend: me.onEdgeSwipeEnd,
                scope: me
            });

            // Add BB10 webworks API for swipe down.
            if (window.blackberry) {
                var toggleMenu = function() {
                    var menus = me.getMenus(),
                        menu = menus.top;

                    if (!menu) {
                        return;
                    }

                    if (menu.isHidden()) {
                        me.showMenu('top');
                    } else {
                        me.hideMenu('top');
                    }
                };

                if (blackberry.app && blackberry.app.event && blackberry.app.event.onSwipeDown) {
                    blackberry.app.event.onSwipeDown(toggleMenu); // PlayBook
                } else if (blackberry.event && blackberry.event.addEventListener) {
                    blackberry.event.addEventListener('swipedown', toggleMenu); // BB10
                }
            }
        }

        menus[config.side] = menu;
        menu.$reveal = Boolean(config.reveal);
        menu.$overSize =  config.overSize;
        menu.$cover = config.cover !== false && !menu.$reveal;
        menu.$side = config.side;

        me.fixMenuSize(menu, config.side);

        if (config.side == 'left') {
            menu.setLeft(0);
            menu.setRight(null);
            menu.setTop(0);
            menu.setBottom(0);
        } else if (config.side == 'right') {
            menu.setLeft(null);
            menu.setRight(0);
            menu.setTop(0);
            menu.setBottom(0);
        } else if (config.side == 'top') {
            menu.setLeft(0);
            menu.setRight(0);
            menu.setTop(0);
            menu.setBottom(null);
        } else if (config.side == 'bottom') {
            menu.setLeft(0);
            menu.setRight(0);
            menu.setTop(null);
            menu.setBottom(0);
        }

        me.setMenus(menus);
    },

    /**
     * Shows a menu specified by the menu's side.
     * @param {String} side The side which the menu is placed.
     */
    showMenu: function(side) {
        var menus = this.getMenus(),
            menu = menus[side],
            before, after,
            viewportBefore, viewportAfter;

        if (!menu || menu.isAnimating) {
            return;
        }

        this.hideOtherMenus(side);

        before = {
            translateX: 0,
            translateY: 0
        };

        after = {
            translateX: 0,
            translateY: 0
        };

        viewportBefore = {
            translateX: 0,
            translateY: 0
        };

        viewportAfter = {
            translateX: 0,
            translateY: 0
        };

        if (menu.$reveal) {
            Ext.getBody().insertFirst(menu.element);
        } else {
            Ext.Viewport.add(menu);
        }

        menu.show();
        menu.addCls('x-' + side);

        var size = (side == 'left' || side == 'right') ? menu.element.getWidth() : menu.element.getHeight();

        if (side == 'left') {
            before.translateX = -size;
            viewportAfter.translateX = size;
        } else if (side == 'right') {
            before.translateX = size;
            viewportAfter.translateX = -size;
        } else if (side == 'top') {
            before.translateY = -size;
            viewportAfter.translateY = size;
        } else if (side == 'bottom') {
            before.translateY = size;
            viewportAfter.translateY = -size;
        }

        if (menu.$overSize) {
            return;
        }

        if (menu.$reveal) {
            if (Ext.browser.getPreferredTranslationMethod() != 'scrollposition') {
                menu.translate(0, 0);
            }
        } else {
            menu.translate(before.translateX, before.translateY);
        }

        if (menu.$cover) {
            menu.getTranslatable().on('animationend', function() {
                menu.isAnimating = false;
            }, this, {
                single: true
            });

            menu.translate(after.translateX, after.translateY, {
                preserveEndState: true,
                duration: 200
            });

        } else {
            this.translate(viewportBefore.translateX, viewportBefore.translateY);

            this.getTranslatable().on('animationend', function() {
                menu.isAnimating = false;
            }, this, {
                single: true
            });

            this.translate(viewportAfter.translateX, viewportAfter.translateY, {
                preserveEndState: true,
                duration: 200
            });
        }

        // Make the menu as animating
        menu.isAnimating = true;
    },

    /**
     * Hides a menu specified by the menu's side.
     * @param {String} side The side which the menu is placed.
     */
    hideMenu: function(side, animate) {
        var menus = this.getMenus(),
            menu = menus[side],
            after, viewportAfter,
            size;

        animate = (animate === false) ? false : true;

        if (!menu || (menu.isHidden() || menu.isAnimating)) {
            return;
        }

        after = {
            translateX: 0,
            translateY: 0
        };

        viewportAfter = {
            translateX: 0,
            translateY: 0
        };

        size = (side == 'left' || side == 'right') ? menu.element.getWidth() : menu.element.getHeight();

        if (side == 'left') {
            after.translateX = -size;
        } else if (side == 'right') {
            after.translateX = size;
        } else if (side == 'top') {
            after.translateY = -size;
        } else if (side == 'bottom') {
            after.translateY = size;
        }

        if (menu.$overSize) {
            menu.hide();
            return;
        }

        if (menu.$cover) {
            if (animate) {
                menu.getTranslatable().on('animationend', function() {
                    menu.isAnimating = false;
                    menu.hide();
                }, this, {
                    single: true
                });

                menu.translate(after.translateX, after.translateY, {
                    preserveEndState: true,
                    duration: 200
                });
            } else {
                menu.translate(after.translateX, after.translateY);
                menu.hide();
            }
        } else {
            if (animate) {
                this.getTranslatable().on('animationend', function() {
                    menu.isAnimating = false;
                    menu.hide();
                }, this, {
                    single: true
                });

                this.translate(viewportAfter.translateX, viewportAfter.translateY, {
                    preserveEndState: true,
                    duration: 200
                });
            } else {
                this.translate(viewportAfter.translateX, viewportAfter.translateY);
                menu.hide();
            }
        }

        this.getNavigation().removeStack(menu.xtype);
    },

    onBack: function() {
        var navigation = this.getNavigation(),
            view;

        /**
          * @event back
          * Evento emitido quando o botão de back for requisitado ou quando for chamado forçadamente.
          * Caso retorne false, as ações não serão executadas (a view não será desempilhada)
        */
        if (this.fireEvent('back', this) === false) {
            return;
        }
 
        view = navigation.back();
        if (!view) {
            navigation.getAppEmptyHistoryBackFn().apply(navigation);
        }
    },

    doBlurInput: function(e) {
        var target = e.target,
            focusedElement = this.focusedElement;
        if (focusedElement && !this.isInputRegex.test(target.tagName) &&
            (target.className.toString().indexOf('ontap-no-blur') < 0)) {
            delete this.focusedElement;
            focusedElement.blur();
        }
    }

});
