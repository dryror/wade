<script setup lang="ts">
import { shortcutModifierOptions, type ShortcutModifier } from '@/utils/shortcutModifier';

const shortcutModifier = defineModel<ShortcutModifier>('shortcutModifier', { required: true });
</script>

<template>
  <section id="shortcuts-section" aria-labelledby="shortcuts-title">
    <header class="settings-section-header">
      <section>
        <h2 id="shortcuts-title">Keyboard shortcuts</h2>
        <p>Choose the modifier key for WADE shortcuts. The other key passes through to terminals.</p>
      </section>
    </header>

    <fieldset id="shortcut-modifier-picker" aria-label="Shortcut modifier">
      <legend>Shortcut modifier</legend>
      <label v-for="option in shortcutModifierOptions" :key="option.value" class="shortcut-modifier-option">
        <input v-model="shortcutModifier" type="radio" name="shortcut-modifier" :value="option.value" />
        <span>{{ option.label }}</span>
      </label>
    </fieldset>
  </section>
</template>

<style scoped>
#shortcuts-section {
  width: min(860px, 100%);
  display: grid;
  gap: 18px;
}

.settings-section-header {
  display: flex;
  align-items: start;
  justify-content: space-between;
  gap: 18px;
  padding-bottom: 13px;
  border-bottom: 1px solid rgb(var(--accent-rgb) / 18%);
}

.settings-section-header h2,
.settings-section-header p {
  margin: 0;
}

.settings-section-header h2 {
  font-size: 18px;
}

.settings-section-header p {
  margin-top: 7px;
  color: var(--muted);
  font-size: 13px;
  line-height: 1.5;
}

#shortcut-modifier-picker {
  min-width: 0;
  display: flex;
  gap: 10px;
  margin: 0;
  padding: 0;
  border: 0;
}

#shortcut-modifier-picker legend {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
  border: 0;
}

.shortcut-modifier-option {
  width: fit-content;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 9px 10px;
  border: 1px solid rgb(var(--accent-rgb) / 30%);
  background: rgb(0 0 0 / 12%);
  color: var(--muted);
  font-size: 13px;
  cursor: pointer;
}

.shortcut-modifier-option:has(input:checked) {
  border-color: var(--text);
  background: rgb(var(--accent-rgb) / 12%);
  color: var(--text);
}

.shortcut-modifier-option input {
  width: 13px;
  height: 13px;
  appearance: none;
  display: grid;
  place-items: center;
  margin: 0;
  border: 1px solid currentColor;
  border-radius: 0;
  background: transparent;
}

.shortcut-modifier-option input:checked::before {
  width: 7px;
  height: 7px;
  background: currentColor;
  content: '';
}

.shortcut-modifier-option:focus-within,
.shortcut-modifier-option:hover {
  border-color: var(--text);
  color: var(--text);
}

@media (max-width: 720px) {
  .settings-section-header {
    align-items: stretch;
    flex-direction: column;
  }
}
</style>
