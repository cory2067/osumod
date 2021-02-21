import React, { Component } from "react";
import "../../utilities.css";
import "./Home.css";

import { navigate } from "@reach/router";
import { Layout, Button, List } from "antd";
import { get, post } from "../../utilities";
const { Content } = Layout;

class Home extends Component {
  constructor(props) {
    super(props);
    this.form = React.createRef();
    this.state = { queues: [], creating: false };
  }

  componentDidMount() {
    get("/api/queues").then((queues) => this.setState({ queues }));
  }

  create = async () => {
    try {
      this.setState({ creating: true });
      await post("/api/create-queue");
      navigate(`/${this.props.user.username}/settings`);
    } catch (e) {
      console.log(e);
      alert("Something went horribly wrong. Please report this issue to Cychloryn.");
    }
    this.setState({ creating: false });
  };

  render() {
    return (
      <Content className="u-flex-justifyCenter">
        <div className="Home-container">
          <div className="Home-create">
            {this.props.user._id ? (
              <Button type="primary" loading={this.state.creating} onClick={this.create}>
                Create a Queue
              </Button>
            ) : (
              <div>Log in to create your own queue</div>
            )}
          </div>

          <List
            className="Home-list"
            header={<div>Modding Queues</div>}
            size="large"
            bordered
            loading={!this.state.queues.length}
            dataSource={this.state.queues}
            renderItem={(item) => (
              <List.Item key={item._id}>
                <List.Item.Meta
                  title={<a href={`/${item.owner}`}>{item.owner}</a>}
                  description={item.modderType === "modder" ? "Modder" : "Beatmap Nominator"}
                />

                <div>{item.open ? "Open" : "Closed"}</div>
              </List.Item>
            )}
          />
        </div>
      </Content>
    );
  }
}

export default Home;
