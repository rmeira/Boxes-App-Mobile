import React, { Component } from "react";
import { View, Text, FlatList, TouchableOpacity } from "react-native";
import AsyncStorage from "@react-native-community/async-storage";
import Icon from "react-native-vector-icons/MaterialIcons";
import imagePicker from "react-native-image-picker";
import RNFS from "react-native-fs";
import FileViewer from "react-native-file-viewer";

import api from "../../services/api";
import { distanceInWords } from "date-fns";
import pt from "date-fns/locale/pt";
import socket from "socket.io-client";

import styles from "./styles";

export default class Box extends Component {
  state = { box: {} };

  async componentDidMount() {
    const box = await AsyncStorage.getItem("@RocketBox:box");

    const response = await api.get(`boxes/${box}`);

    this.subscribeToNewFiles(box);

    this.setState({ box: response.data });
  }

  subscribeToNewFiles = box => {
    const io = socket("https://boxes-app-backend.herokuapp.com");

    io.emit("connectRoom", box);

    io.on("file", data => {
      this.setState({
        box: {
          ...this.state.box,
          files: [data, ...this.state.box.files]
        }
      });
    });
  };

  openFile = async file => {
    try {
      const filePath = `${RNFS.DocumentDirectoryPath}/${file.title}`;

      await RNFS.downloadFile({
        fromUrl: file.url,
        toFile: filePath
      });

      await FileViewer.open(filePath);
    } catch (error) {
      console.log(error);
    }
  };

  handleUpload = () => {
    imagePicker.launchImageLibrary({}, async upload => {
      if (upload.error || upload.didCancel) {
        console.log("ImagePicker error");
      } else {
        const data = new FormData();

        const [prefix, sufix] = upload.fileName.split(".");
        const ext = sufix.toLowerCase() === "heic" ? "jpg" : sufix;

        data.append("file", {
          uri: upload.uri,
          type: upload.type,
          name: `${prefix}.${ext}`
        });

        api.post(`boxes/${this.state.box._id}/filex`, data);
      }
    });
  };

  renderItem = ({ item }) => (
    <TouchableOpacity onPress={() => this.openFile(item)} style={styles.file}>
      <View style={styles.fileInfo}>
        <Icon name="insert-drive-file" size={24} color="#A5CFFF" />
        <Text style={styles.fileTitle}>{item.title}</Text>
      </View>

      <Text style={styles.fileDate}>
        há{" "}
        {distanceInWords(item.createdAt, new Date(), {
          locale: pt
        })}
      </Text>
    </TouchableOpacity>
  );

  render() {
    return (
      <View style={styles.container}>
        <Text style={styles.boxTitle}>{this.state.box.title}</Text>

        <FlatList
          style={styles.list}
          data={this.state.box.files}
          keyExtractor={file => file._id}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          renderItem={this.renderItem}
        />

        <TouchableOpacity style={styles.fab} onPress={this.handleUpload}>
          <Icon name="cloud-upload" size={24} color="#fff" />
        </TouchableOpacity>
      </View>
    );
  }
}
