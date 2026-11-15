import { useEffect, useState } from 'react';
import { Keyboard, LayoutAnimation, Platform } from 'react-native';

/**
 * Height of the on-screen keyboard, 0 when it is closed.
 *
 * The app is edge-to-edge, so Android doesn't resize the window for the
 * keyboard (and iOS never does). `Shell` pads the screen by this height and
 * hides the tab bar, so whatever is at the bottom of a screen (the chat field
 * on "Kerro lisää") sits right above the keyboard.
 */
export function useKeyboardHeight(): number {
  const [height, setHeight] = useState(0);
  useEffect(() => {
    // iOS has "will" events, so the layout can move together with the keyboard.
    const ios = Platform.OS === 'ios';
    const animate = (duration?: number) => {
      if (ios) LayoutAnimation.configureNext(LayoutAnimation.create(duration || 250, 'keyboard', 'opacity'));
    };
    const show = Keyboard.addListener(ios ? 'keyboardWillShow' : 'keyboardDidShow', (e) => {
      animate(e.duration);
      setHeight(e.endCoordinates.height);
    });
    const hide = Keyboard.addListener(ios ? 'keyboardWillHide' : 'keyboardDidHide', (e) => {
      animate(e?.duration);
      setHeight(0);
    });
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);
  return height;
}
