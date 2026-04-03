import { useCallback, useEffect, useRef } from "react";

type PointerEventLike = {
  pointerType: string;
  pointerId: number;
  clientX: number;
  clientY: number;
  preventDefault: () => void;
  stopPropagation: () => void;
};

interface UseTouchLongPressOptions {
  onLongPress: () => void;
  delay?: number;
  moveThreshold?: number;
}

export function useTouchLongPress({
  onLongPress,
  delay = 450,
  moveThreshold = 10,
}: UseTouchLongPressOptions) {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activePointerIdRef = useRef<number | null>(null);
  const startPointRef = useRef<{ x: number; y: number } | null>(null);
  const longPressTriggeredRef = useRef(false);

  const clearPendingLongPress = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    activePointerIdRef.current = null;
    startPointRef.current = null;
  }, []);

  const onPointerDown = useCallback((event: PointerEventLike) => {
    if (event.pointerType !== "touch") return;

    longPressTriggeredRef.current = false;
    activePointerIdRef.current = event.pointerId;
    startPointRef.current = { x: event.clientX, y: event.clientY };

    timeoutRef.current = setTimeout(() => {
      longPressTriggeredRef.current = true;
      onLongPress();
      timeoutRef.current = null;
    }, delay);
  }, [delay, onLongPress]);

  const onPointerMove = useCallback((event: PointerEventLike) => {
    if (event.pointerType !== "touch") return;
    if (activePointerIdRef.current !== event.pointerId || !startPointRef.current) return;

    const movedX = Math.abs(event.clientX - startPointRef.current.x);
    const movedY = Math.abs(event.clientY - startPointRef.current.y);

    if (movedX > moveThreshold || movedY > moveThreshold) {
      clearPendingLongPress();
    }
  }, [clearPendingLongPress, moveThreshold]);

  const onPointerUp = useCallback((event: PointerEventLike) => {
    if (event.pointerType !== "touch") return;
    if (activePointerIdRef.current !== event.pointerId) return;
    clearPendingLongPress();
  }, [clearPendingLongPress]);

  const onPointerCancel = useCallback(() => {
    clearPendingLongPress();
  }, [clearPendingLongPress]);

  const onClickCapture = useCallback((event: { preventDefault: () => void; stopPropagation: () => void }) => {
    if (!longPressTriggeredRef.current) return;
    event.preventDefault();
    event.stopPropagation();
    longPressTriggeredRef.current = false;
  }, []);

  const onContextMenu = useCallback((event: { preventDefault: () => void }) => {
    if (!longPressTriggeredRef.current) return;
    event.preventDefault();
  }, []);

  useEffect(() => clearPendingLongPress, [clearPendingLongPress]);

  return {
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerCancel,
    onClickCapture,
    onContextMenu,
  };
}