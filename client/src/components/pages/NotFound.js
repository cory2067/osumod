import React, { Component } from "react";
import { Layout } from "antd";
const { Content } = Layout;

class NotFound extends Component {
  constructor(props) {
    super(props);
  }

  render() {
    return (
      <Content className="content">
        <h1>404 Not Found</h1>
        <p>The page you requested couldn't be found.</p>
      </Content>
    );
  }
}

export default NotFound;
