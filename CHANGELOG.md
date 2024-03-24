# Changelog

## 1.3.2
* Add support for D&D5e 3.1.0's Dark Theme
* Fix Talent Power spell preparation mode showing up blank
    * Uses the new spellcastingTypes/spellPreparationModes. (Implementation is a little bit janky since it's designed for Pact-type casting)
* Fix localisation tooltip for maximum strain name in configuration options

## 1.3.1
* Fix missing power specialty icons

## 1.3.0

* Update to support D&D5e 3.0.0's new default sheet - now requires 3.0.0 as a minimum version
    * Power specialties now have icons, courtesy of https://game-icons.net
    * The Strain tab comes immediately after the spellbook, instead of at the end
    * Added a new spellcasting progression for talents (which is effectively 0 slots per level) so the spellcasting card appears in the spellbook
    * "Talent Spellcasting" gets renamed to "Talent Psionics" on the Spellcasting tab

## 1.2.2

* Fix a bug where opening a non-talent's sheet would result in just the actor's image being visible with nothing else

## 1.2.1

* Update to support D&D5e 2.4.0

## 1.2.0

* Adds a flag for tracking max strain for other modules/effects to hook into. Found at `flags.ceane-talent.strain.max`
* Allows strain and the strain tracks to be renamed in the module settings

## 1.1.0

* Adds a flag for tracking total strain for other modules/effects to hook into. Found at `flags.ceane-talent.strain.total`
* Fixes a couple of bugs for V10 users

## 1.0.1

* Fixes the missing `languages` folder in the package release

## 1.0.0

Initial release

* Supports Vanilla and Tidy5e sheets, and Ready Set Roll.
* Spellbook
    * Power specialties are added to spell schools
    * Talent Power is added as a spell preparation mode
    * Spell Levels are automatically converted to Power Orders for talent powers
* Strain tab
    * Total and Maximum strain are automatically calculated
    * Strain can be applied by clicking checkbox for desired effect, or editing the numbers in the input boxes
    * Invalid options are automatically greyed out
