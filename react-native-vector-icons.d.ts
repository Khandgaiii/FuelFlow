declare module 'react-native-vector-icons/MaterialCommunityIcons' {
  import { Component } from 'react';
  import { ViewProps } from 'react-native';

  interface MaterialCommunityIconsProps extends ViewProps {
    name: string;
    size?: number;
    color?: string;
  }

  class MaterialCommunityIcons extends Component<MaterialCommunityIconsProps> {}
  export default MaterialCommunityIcons;
}
