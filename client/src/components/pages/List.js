import React, { Component } from "react";
import ReactMarkdown from "react-markdown";
import "../../utilities.css";
import "./List.css";

// data from "../../content/home-en";
import { Layout, Card } from "antd";
const { Content } = Layout;

class List extends Component {
  constructor(props) {
    super(props);
    this.state = {};
  }

  componentDidMount() {
    document.title = "osumod";
  }

  render() {
    return <Content className="content">i'll make this page later lol</Content>;
  }
}

export default List;
