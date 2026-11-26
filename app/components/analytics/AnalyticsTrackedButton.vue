<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    eventName?: string;
    eventCategory?: string;
    eventLabel?: string;
    eventValue?: number;
    color?: 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'neutral';
    variant?: 'solid' | 'outline' | 'soft' | 'subtle' | 'ghost' | 'link';
    size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
    icon?: string;
    trailingIcon?: string;
    loading?: boolean;
    disabled?: boolean;
    to?: string;
    block?: boolean;
    type?: 'button' | 'submit' | 'reset';
  }>(),
  {
    eventName: 'button_click',
    eventCategory: 'engagement',
    color: 'primary',
    variant: 'solid',
    size: 'md',
    type: 'button',
  }
);

const emit = defineEmits<{
  (e: 'click', event: MouseEvent): void;
}>();

const { trackEvent } = useAnalytics();

function handleClick(event: MouseEvent) {
  if (props.disabled || props.loading) return;

  const extractedLabel = props.eventLabel || (event.currentTarget as HTMLElement)?.innerText?.trim() || undefined;

  // Fire analytics tracking event
  trackEvent(props.eventName, {
    eventCategory: props.eventCategory,
    eventLabel: extractedLabel,
    eventValue: props.eventValue,
  });

  emit('click', event);
}
</script>

<template>
  <UButton
    :color="color"
    :variant="variant"
    :size="size"
    :icon="icon"
    :trailing-icon="trailingIcon"
    :loading="loading"
    :disabled="disabled"
    :to="to"
    :block="block"
    :type="type"
    @click="handleClick"
  >
    <slot />
  </UButton>
</template>
