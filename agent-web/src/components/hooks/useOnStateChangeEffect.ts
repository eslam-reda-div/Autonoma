import { usePrevious } from "@react-hookz/web";
import { useEffect } from "react";

export function useOnStateChangeEffect<T>(
  state: T,
  { from, to }: { from: T; to: T },
  effect: (prevState: T, newState: T) => void,
) {
  const prevState = usePrevious(state);

  useEffect(() => {
    if (prevState === from && state === to) {
      effect(from, to);
    }
  }, [effect, from, prevState, state, to]);
}
