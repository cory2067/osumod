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
        <p>Either you have the wrong link, or the queue you're looking for has been deactivated.</p>
        <p>
          Queues may be deactivated if they aren't used for a long time. If you were the owner of
          this queue, you can reactivate it by simply pushing the "Create Queue" button on the home
          page.
        </p>
      </Content>
    );
  }
}

export default NotFound;
