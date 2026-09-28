import {
  SafeAreaView,
  StatusBar,
  StyleSheet,
} from "react-native";

import WebViewApp from "./src/WebViewApp";


export default function App() {

  return (

    <SafeAreaView
      style={styles.container}
    >

      <StatusBar
        barStyle="dark-content"
      />

      <WebViewApp />

    </SafeAreaView>

  );

}


const styles = StyleSheet.create({

  container: {
    flex: 1,
  },

});